const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const EmailService = require('./emailService');
const TimeoutHandler = require('./timeoutHandler');

const EVENTS_DIR = path.join(__dirname, '../../data/events');
const TOKENS_FILE = path.join(__dirname, '../../data/magic_tokens.json');

// Email service
let emailService;
try {
  emailService = new EmailService();
} catch (error) {
  console.warn('Email service not available for magic links');
}

// Ensure tokens file exists
async function ensureTokensFile() {
  try {
    await fs.access(TOKENS_FILE);
  } catch {
    await fs.mkdir(path.dirname(TOKENS_FILE), { recursive: true });
    await fs.writeFile(TOKENS_FILE, JSON.stringify({ tokens: {} }, null, 2));
  }
}

// Load tokens
async function loadTokens() {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { tokens: {} };
  }
}

// Save tokens
async function saveTokens(tokensData) {
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokensData, null, 2));
}

// Helper function to parse time limits
function parseTimeLimit(timeLimit) {
  const units = {
    'hours': 60 * 60 * 1000,
    'days': 24 * 60 * 60 * 1000,
    'weeks': 7 * 24 * 60 * 60 * 1000
  };
  
  const match = timeLimit.match(/(\d+)\s*(hours?|days?|weeks?)/i);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    return value * (units[unit] || units['days']);
  }
  
  return 30 * units['days']; // Default to 30 days
}

class MagicLinkService {
  constructor() {
    this.timeoutHandler = null; // Lazy load to avoid circular dependency
  }

  getTimeoutHandler() {
    if (!this.timeoutHandler) {
      this.timeoutHandler = new TimeoutHandler();
    }
    return this.timeoutHandler;
  }

  async sendMagicLink(eventId, stepId, vendorEmail) {
    try {
      // Read event to validate
      const eventPath = path.join(EVENTS_DIR, `${eventId}.json`);
      const eventData = await fs.readFile(eventPath, 'utf8');
      const event = JSON.parse(eventData);
      
      const step = event.steps.find(s => s.id === stepId);
      if (!step) {
        throw new Error('Step not found');
      }
      
      if (step.vendor_email !== vendorEmail) {
        throw new Error('Vendor email does not match step assignment');
      }
      
      // Generate magic token
      const token = jwt.sign(
        {
          event_id: eventId,
          step_id: stepId,
          vendor_email: vendorEmail,
          purpose: 'step_completion'
        },
        process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        { expiresIn: step.time_limit || '30 days' }
      );
      
      const magicLink = `${process.env.BASE_URL || 'http://localhost:3000'}/complete/${token}`;
      
      // Store token for tracking
      await ensureTokensFile();
      const tokensData = await loadTokens();
      tokensData.tokens[token] = {
        event_id: eventId,
        step_id: stepId,
        vendor_email: vendorEmail,
        created_at: new Date().toISOString(),
        expires_at: step.time_limit ? new Date(Date.now() + parseTimeLimit(step.time_limit)).toISOString() : null,
        used: false
      };
      await saveTokens(tokensData);
      
      // Start timeout monitoring for this step
      if (step.time_limit) {
        await this.getTimeoutHandler().startStepTimeout(eventId, stepId, vendorEmail, step.time_limit);
      }
      
      // Send email if email service is configured
      if (emailService) {
        try {
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">You have a task to complete</h2>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Event:</strong> ${event.name}</p>
                <p><strong>Event ID:</strong> ${eventId}</p>
                <p><strong>Task:</strong> ${step.name}</p>
                <p><strong>Description:</strong> ${step.description || 'No description provided'}</p>
                ${step.time_limit ? `<p><strong>Time Limit:</strong> ${step.time_limit}</p>` : ''}
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Complete This Step
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                This link is unique to you and will expire in ${step.time_limit || '30 days'}.
              </p>
            </div>
          `;

          const textBody = `
You have a task to complete

Event: ${event.name}
Event ID: ${eventId}
Task: ${step.name}
Description: ${step.description || 'No description provided'}
${step.time_limit ? `Time Limit: ${step.time_limit}` : ''}

Click here to complete: ${magicLink}

This link is unique to you and will expire in ${step.time_limit || '30 days'}.
          `;

          await emailService.sendEmail(
            vendorEmail,
            `Action Required: ${step.name} for ${event.name}`,
            htmlBody,
            textBody
          );
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the request if email fails
        }
      }
      
      return { 
        success: true, 
        message: 'Magic link sent',
        magic_link: magicLink // For testing purposes
      };
    } catch (error) {
      console.error('Error sending magic link:', error);
      throw error;
    }
  }
}

module.exports = MagicLinkService;