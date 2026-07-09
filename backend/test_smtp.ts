import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

async function run() {
  console.log('Testing SMTP connection...');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('User:', process.env.SMTP_USER);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Olive Pizza" <noreply@olivepizza.app>',
      to: 'samyakshrivastava28@gmail.com', // Since it's a test for Samyak
      subject: 'Test SMTP Email for Olive Pizza',
      html: '<h1>SMTP is working!</h1><p>This is a test email sent from the antigravity agent.</p>',
    });
    console.log('Message sent successfully. Message ID:', info.messageId);
  } catch (error) {
    console.error('SMTP test failed:', error);
  }
}
run();
