const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.msmtpPath = '/usr/bin/msmtp';
    this.tempDir = path.join(__dirname, '../../data/temp');
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async sendEmail(to, subject, htmlBody, textBody = null) {
    try {
      await this.ensureTempDir();
      
      // Create email content
      const emailContent = this.createEmailContent(to, subject, htmlBody, textBody);
      
      // Write email to temporary file
      const tempFile = path.join(this.tempDir, `email_${Date.now()}.txt`);
      await fs.writeFile(tempFile, emailContent);
      
      // Send email using msmtp
      return new Promise((resolve, reject) => {
        exec(`${this.msmtpPath} -t < ${tempFile}`, (error, stdout, stderr) => {
          // Clean up temp file
          fs.unlink(tempFile).catch(() => {});
          
          if (error) {
            console.error('MSMTP Error:', error);
            reject(new Error(`Failed to send email: ${error.message}`));
          } else {
            console.log('Email sent successfully to:', to);
            resolve({ success: true, message: 'Email sent successfully' });
          }
        });
      });
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  createEmailContent(to, subject, htmlBody, textBody) {
    const textContent = textBody || this.htmlToText(htmlBody);
    
    return `To: ${to}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset=UTF-8

${textContent}

--boundary123
Content-Type: text/html; charset=UTF-8

${htmlBody}

--boundary123--
`;
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  async testConnection() {
    try {
      return new Promise((resolve, reject) => {
        exec(`${this.msmtpPath} --version`, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`MSMTP not available: ${error.message}`));
          } else {
            console.log('MSMTP version:', stdout.trim());
            resolve({ success: true, version: stdout.trim() });
          }
        });
      });
    } catch (error) {
      throw new Error(`MSMTP test failed: ${error.message}`);
    }
  }
}

module.exports = EmailService;