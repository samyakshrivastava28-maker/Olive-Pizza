import nodemailer from 'nodemailer';
import { pgPool } from '../config/postgres.js';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter object using the default SMTP transport
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generic Queue function to add an email to the queue
export const queueEmail = async (
  recipient: string,
  subject: string,
  htmlContent: string,
  type: 'transactional' | 'marketing' = 'transactional',
  campaignId: number | null = null
) => {
  try {
    const query = `
      INSERT INTO email_queue (recipient, subject, html_content, type, campaign_id, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `;
    const values = [recipient, subject, htmlContent, type, campaignId];
    const result = await pgPool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.warn('Database queue failed (table might be missing). Falling back to direct send:', error);
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Olive Pizza" <noreply@olivepizza.app>',
        to: recipient,
        subject: subject,
        html: htmlContent,
      });
      return -1; // Indicates direct send was used
    } catch (directError) {
      console.error('Direct send also failed:', directError);
      throw directError;
    }
  }
};

// Process Queue
export const processEmailQueue = async () => {
  // Grab up to 20 pending emails
  try {
    const { rows: emails } = await pgPool.query(`
      SELECT * FROM email_queue 
      WHERE status = 'pending' OR (status = 'failed' AND retry_count < 3)
      ORDER BY type DESC, created_at ASC 
      LIMIT 20
    `);

    if (emails.length === 0) return;

    console.log(`Processing ${emails.length} emails from queue...`);

    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Olive Pizza" <noreply@olivepizza.app>',
          to: email.recipient,
          subject: email.subject,
          html: email.html_content,
        });

        // Mark as sent
        await pgPool.query(`
          UPDATE email_queue 
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [email.id]);

        // If it belongs to a campaign, increment sent_count
        if (email.campaign_id) {
          await pgPool.query(`
            UPDATE email_campaigns 
            SET sent_count = sent_count + 1 
            WHERE id = $1
          `, [email.campaign_id]);
        }

      } catch (error: any) {
        console.error(`Failed to send email ${email.id}:`, error);
        
        // Mark as failed and increment retry_count
        const newRetryCount = email.retry_count + 1;
        const newStatus = newRetryCount >= 3 ? 'failed' : 'pending';

        await pgPool.query(`
          UPDATE email_queue 
          SET status = $1, retry_count = $2, last_error = $3 
          WHERE id = $4
        `, [newStatus, newRetryCount, error.message, email.id]);

        // If it belongs to a campaign and completely failed, increment fail_count
        if (email.campaign_id && newStatus === 'failed') {
          await pgPool.query(`
            UPDATE email_campaigns 
            SET fail_count = fail_count + 1 
            WHERE id = $1
          `, [email.campaign_id]);
        }
      }
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
};
