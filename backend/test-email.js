#!/usr/bin/env node

const EmailService = require('./utils/emailService');

async function testEmail() {
  console.log('🧪 Testing MSMTP Email Configuration...\n');

  try {
    // Initialize email service
    const emailService = new EmailService();
    
    // Test connection
    console.log('1. Testing MSMTP connection...');
    const connectionTest = await emailService.testConnection();
    console.log('✅ MSMTP connection successful:', connectionTest.version);
    
    // Test email sending
    console.log('\n2. Testing email sending...');
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🎉 GitDone Email Test</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Status:</strong> Email configuration is working!</p>
          <p><strong>Service:</strong> MSMTP</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you received this email, your GitDone email setup is working correctly.
        </p>
      </div>
    `;

    const textBody = `
GitDone Email Test

Status: Email configuration is working!
Service: MSMTP
Time: ${new Date().toLocaleString()}

If you received this email, your GitDone email setup is working correctly.
    `;

    const result = await emailService.sendEmail(
      testEmail,
      'GitDone Email Test - Configuration Working!',
      htmlBody,
      textBody
    );
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Check your inbox at:', testEmail);
    console.log('\n🎯 Next steps:');
    console.log('1. Go to your event dashboard');
    console.log('2. Click "Send Reminder" for any step');
    console.log('3. Check vendor emails for magic links');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check ~/.msmtprc configuration');
    console.log('2. Verify Gmail app password');
    console.log('3. Ensure 2FA is enabled');
    console.log('4. Check file permissions: chmod 600 ~/.msmtprc');
    console.log('5. View logs: tail -f ~/.msmtp.log');
  }
}

// Run the test
testEmail().catch(console.error);