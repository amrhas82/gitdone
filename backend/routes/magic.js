const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

const EVENTS_DIR = path.join(__dirname, '../../data/events');
const TOKENS_FILE = path.join(__dirname, '../../data/magic_tokens.json');

// Email transporter
let transporter;
try {
  transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} catch (error) {
  console.warn('Email configuration not set up. Set SMTP_USER and SMTP_PASS environment variables.');
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

// POST /api/magic/send - Send magic link
router.post('/send', async (req, res) => {
  try {
    const { event_id, step_id, vendor_email } = req.body;
    
    if (!event_id || !step_id || !vendor_email) {
      return res.status(400).json({ error: 'Missing required fields: event_id, step_id, vendor_email' });
    }
    
    // Read event to validate
    const eventPath = path.join(EVENTS_DIR, `${event_id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    const step = event.steps.find(s => s.id === step_id);
    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }
    
    if (step.vendor_email !== vendor_email) {
      return res.status(403).json({ error: 'Vendor email does not match step assignment' });
    }
    
    // Generate magic token
    const token = jwt.sign(
      {
        event_id,
        step_id,
        vendor_email,
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
      event_id,
      step_id,
      vendor_email,
      created_at: new Date().toISOString(),
      expires_at: step.time_limit ? new Date(Date.now() + parseTimeLimit(step.time_limit)).toISOString() : null,
      used: false
    };
    await saveTokens(tokensData);
    
    // Send email if transporter is configured
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: vendor_email,
          subject: `Action Required: ${step.name} for ${event.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">You have a task to complete</h2>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Event:</strong> ${event.name}</p>
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
          `
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Magic link sent',
      magic_link: magicLink // For testing purposes
    });
  } catch (error) {
    console.error('Error sending magic link:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/magic/send-all - Send magic links to all pending steps
router.post('/send-all', async (req, res) => {
  try {
    const { event_id } = req.body;
    
    if (!event_id) {
      return res.status(400).json({ error: 'Missing required field: event_id' });
    }
    
    // Read event
    const eventPath = path.join(EVENTS_DIR, `${event_id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    const pendingSteps = event.steps.filter(step => step.status === 'pending');
    const results = [];
    
    for (const step of pendingSteps) {
      try {
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/magic/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id,
            step_id: step.id,
            vendor_email: step.vendor_email
          })
        });
        
        const result = await response.json();
        results.push({
          step_id: step.id,
          step_name: step.name,
          vendor_email: step.vendor_email,
          success: result.success,
          error: result.error
        });
      } catch (error) {
        results.push({
          step_id: step.id,
          step_name: step.name,
          vendor_email: step.vendor_email,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Processed ${results.length} steps`,
      results 
    });
  } catch (error) {
    console.error('Error sending all magic links:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/magic/status/:token - Check token status
router.get('/status/:token', async (req, res) => {
  try {
    const tokensData = await loadTokens();
    const tokenData = tokensData.tokens[req.params.token];
    
    if (!tokenData) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    res.json({
      valid: !tokenData.used && (!tokenData.expires_at || new Date(tokenData.expires_at) > new Date()),
      used: tokenData.used,
      expires_at: tokenData.expires_at,
      created_at: tokenData.created_at
    });
  } catch (error) {
    console.error('Error checking token status:', error);
    res.status(500).json({ error: error.message });
  }
});

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

module.exports = router;