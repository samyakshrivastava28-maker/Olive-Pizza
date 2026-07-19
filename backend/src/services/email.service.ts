import nodemailer from 'nodemailer';
import { pgPool } from '../config/postgres.js';
import dotenv from 'dotenv';
dotenv.config();

// Fast fail on missing env
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("CRITICAL ERROR: SMTP credentials missing in environment variables. Emails will fail.");
}

// Create reusable transporter object using the default SMTP transport
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify SMTP Connection on Startup
transporter.verify((error, success) => {
  if (error) {
    console.error("==========================================");
    console.error("FATAL EMAIL ERROR: SMTP Verification Failed!");
    console.error("==========================================");
    console.error("SMTP Response:", error.message);
    console.error("Stack Trace:", error.stack);
    console.error("Configuration Used:");
    console.error(`Host: ${process.env.SMTP_HOST}`);
    console.error(`Port: ${process.env.SMTP_PORT}`);
    console.error(`User: ${process.env.SMTP_USER}`);
    console.error("==========================================");
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

// Generic Queue function to add an email to the queue
export const queueEmail = async (
  recipient: string,
  subject: string,
  htmlContent: string,
  type: 'transactional' | 'marketing' | 'auth' = 'transactional',
  campaignId: number | null = null,
  idempotencyKey: string | null = null
) => {
  try {
    let result;
    if (idempotencyKey) {
      // With idempotency key — deduplicate
      result = await pgPool.query(`
        INSERT INTO email_queue (recipient, subject, html_content, type, campaign_id, idempotency_key, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      `, [recipient, subject, htmlContent, type, campaignId, idempotencyKey]);
      if (result.rows.length === 0) {
        console.log(`Email to ${recipient} with key ${idempotencyKey} already queued. (Idempotent)`);
        return null;
      }
    } else {
      // No idempotency key — always insert
      result = await pgPool.query(`
        INSERT INTO email_queue (recipient, subject, html_content, type, campaign_id, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id
      `, [recipient, subject, htmlContent, type, campaignId]);
    }
    return result.rows[0].id;
  } catch (error: any) {
    console.error('==========================================');
    console.error('FATAL QUEUE ERROR: Failed to insert email into DB!');
    console.error(`Recipient: ${recipient} | Type: ${type}`);
    console.error('Error Details:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('==========================================');
    
    // Fallback: Direct send if DB is completely down but we still need transactional emails
    console.warn('Attempting immediate direct send due to queue failure...');
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Olive Pizza" <noreply@olivepizza.app>',
        to: recipient,
        subject: subject,
        html: htmlContent,
      });
      console.log('Direct fallback send successful:', info.messageId);
      return -1;
    } catch (directError: any) {
      console.error('Direct fallback send also failed:', directError.message);
      throw directError; // Let caller handle it (e.g., API 500)
    }
  }
};


// Process Queue
export const processEmailQueue = async () => {
  try {
    // Grab up to 20 pending emails or emails that failed and need retrying (exponential backoff)
    // Retry backoff logic: retry_count = 1 -> wait 1 min, retry_count = 2 -> wait 5 min, retry_count = 3 -> wait 15 min
    const { rows: emails } = await pgPool.query(`
      SELECT * FROM email_queue 
      WHERE status = 'pending' 
         OR (status = 'failed' AND retry_count < max_retries 
             AND (retry_timestamp IS NULL OR retry_timestamp <= CURRENT_TIMESTAMP))
      ORDER BY type DESC, created_at ASC 
      LIMIT 20
    `);

    if (emails.length === 0) return;

    console.log(`Processing ${emails.length} emails from queue...`);

    for (const email of emails) {
      try {
        // Mark as processing
        await pgPool.query(`UPDATE email_queue SET status = 'processing' WHERE id = $1`, [email.id]);

        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Olive Pizza" <noreply@olivepizza.app>',
          to: email.recipient,
          subject: email.subject,
          html: email.html_content,
        });

        // Mark as sent
        await pgPool.query(`
          UPDATE email_queue 
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP, smtp_response = $2
          WHERE id = $1
        `, [email.id, info.response]);

        // If it belongs to a campaign, increment sent_count
        if (email.campaign_id) {
          await pgPool.query(`
            UPDATE email_campaigns 
            SET sent_count = sent_count + 1 
            WHERE id = $1
          `, [email.campaign_id]);
        }

      } catch (error: any) {
        console.error(`==========================================`);
        console.error(`EMAIL SEND FAILED for Queue ID ${email.id}`);
        console.error(`Recipient: ${email.recipient}`);
        console.error(`SMTP Error: ${error.message}`);
        console.error(`SMTP Code: ${error.code || 'N/A'}`);
        console.error(`SMTP Command: ${error.command || 'N/A'}`);
        console.error(`==========================================`);
        
        // Mark as failed, increment retry_count, calculate backoff
        const newRetryCount = email.retry_count + 1;
        let nextRetryMinutes = 0;
        if (newRetryCount === 1) nextRetryMinutes = 1;
        else if (newRetryCount === 2) nextRetryMinutes = 5;
        else nextRetryMinutes = 15;

        const newStatus = newRetryCount >= email.max_retries ? 'failed' : 'pending'; // pending = will be picked up when retry_timestamp passes

        // If max retries reached, move to dead letter queue
        if (newRetryCount >= email.max_retries) {
            console.error(`Max retries reached for Queue ID ${email.id}. Moving to Dead Letter Queue.`);
            await pgPool.query(`
              INSERT INTO dead_letter_queue (original_queue_id, recipient, subject, payload, final_error)
              VALUES ($1, $2, $3, $4, $5)
            `, [email.id, email.recipient, email.subject, email.html_content, error.message]);
            
            await pgPool.query(`
              UPDATE email_queue SET status = 'failed', retry_count = $2, last_error = $3, smtp_response = $4, retry_timestamp = NULL
              WHERE id = $1
            `, [email.id, newRetryCount, error.message, error.response || error.message]);
        } else {
            await pgPool.query(`
              UPDATE email_queue 
              SET status = $1, retry_count = $2, last_error = $3, smtp_response = $4, 
                  retry_timestamp = CURRENT_TIMESTAMP + ($5::text || ' minutes')::interval
              WHERE id = $6
            `, [newStatus, newRetryCount, error.message, error.response || error.message, nextRetryMinutes, email.id]);
        }
      }
    }
  } catch (error: any) {
    console.error('==========================================');
    console.error('ERROR in processEmailQueue Loop:', error.message);
    console.error(error.stack);
    console.error('==========================================');
  }
};
