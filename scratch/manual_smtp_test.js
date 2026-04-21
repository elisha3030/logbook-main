const nodemailer = require('nodemailer');
require('dotenv').config();

async function test() {
  console.log('Using SMTP Settings:');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
  });

  try {
    console.log('Attempting to send email...');
    let info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to self
      subject: '🧪 Manual Diagnostic Test',
      text: 'Testing SMTP connection from scratch script.'
    });
    console.log('✅ Success! Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ FAILED to send email:');
    console.error(error);
  }
}

test();
