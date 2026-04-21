const nodemailer = require('nodemailer');
require('dotenv').config();

async function test() {
  console.log('Testing Port 465 (SSL)...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
  });

  try {
    let info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: '🧪 Port 465 Diagnostic Test',
      text: 'Testing SMTP connection over Port 465.'
    });
    console.log('✅ Port 465 Success! Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Port 465 FAILED:');
    console.error(error.message);
  }
}

test();
