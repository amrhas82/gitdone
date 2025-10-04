const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const EmailService = require('../utils/emailService');

const EVENTS_DIR = path.join(__dirname, '../../data/events');
const MANAGEMENT_TOKENS_FILE = path.join(__dirname, '../../data/management_tokens.json');

// Email service
let emailService;
try {
  emailService = new EmailService();
} catch (error) {
  console.warn('Email service not available for management links');
}

// Ensure management tokens file exists
async function ensureManagementTokensFile() {
  try {
    await fs.access(MANAGEMENT_TOKENS_FILE);
  } catch {
    await fs.mkdir(path.dirname(MANAGEMENT_TOKENS_FILE), { recursive: true });
    await fs.writeFile(MANAGEMENT_TOKENS_FILE, JSON.stringify({ tokens: {} }, null, 2));
  }
}

// Load management tokens
async function loadManagementTokens() {
  try {
    const data = await fs.readFile(MANAGEMENT_TOKENS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { tokens: {} };
  }
}

// Save management tokens
async function saveManagementTokens(tokensData) {
  await fs.writeFile(MANAGEMENT_TOKENS_FILE, JSON.stringify(tokensData, null, 2));
}

// POST /api/manage - Send management links for all events owned by email
router.post('/', async (req, res) => {
  try {
    const { owner_email } = req.body;
    
    if (!owner_email) {
      return res.status(400).json({ error: 'Missing required field: owner_email' });
    }
    
    // Find all events owned by this email
    const events = [];
    try {
      const files = await fs.readdir(EVENTS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const eventPath = path.join(EVENTS_DIR, file);
          const eventData = await fs.readFile(eventPath, 'utf8');
          const event = JSON.parse(eventData);
          
          if (event.owner_email === owner_email) {
            events.push(event);
          }
        }
      }
    } catch (error) {
      console.error('Error reading events directory:', error);
      return res.status(500).json({ error: 'Error reading events' });
    }
    
    if (events.length === 0) {
      return res.status(404).json({ error: 'No events found for this email address' });
    }
    
    // Generate management tokens for each event
    const managementLinks = [];
    await ensureManagementTokensFile();
    const tokensData = await loadManagementTokens();
    
    for (const event of events) {
      const token = jwt.sign(
        {
          event_id: event.id,
          owner_email,
          purpose: 'event_management',
          permissions: ['view', 'edit', 'add_steps', 'send_reminders']
        },
        process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        { expiresIn: '7 days' }
      );
      
      const managementLink = `${process.env.BASE_URL || 'http://localhost:3000'}/manage/${token}`;
      
      // Store token for tracking
      tokensData.tokens[token] = {
        event_id: event.id,
        owner_email,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        used: false,
        permissions: ['view', 'edit', 'add_steps', 'send_reminders']
      };
      
      managementLinks.push({
        event_id: event.id,
        event_name: event.name,
        status: event.status,
        steps_count: event.steps.length,
        completed_steps: event.steps.filter(s => s.status === 'completed').length,
        management_link: managementLink
      });
    }
    
    await saveManagementTokens(tokensData);
    
    // Send aggregated email if email service is configured
    if (emailService) {
      try {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">📋 Your Event Management Links</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Manage all your events in one place</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="color: #666; margin-bottom: 25px;">You have <strong>${events.length}</strong> event${events.length > 1 ? 's' : ''} to manage:</p>
              
              ${managementLinks.map((link, index) => `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #f9fafb;">
                  <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #333; font-size: 18px;">${link.event_name}</h3>
                    <span style="background: ${link.status === 'completed' ? '#10b981' : link.status === 'active' ? '#3b82f6' : '#6b7280'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                      ${link.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <strong style="color: #666;">Event ID:</strong><br>
                      <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${link.event_id}</code>
                    </div>
                    <div>
                      <strong style="color: #666;">Progress:</strong><br>
                      <span style="color: #3b82f6; font-weight: bold;">${link.completed_steps}/${link.steps_count} steps</span>
                    </div>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${link.management_link}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 14px;">
                      Manage This Event
                    </a>
                  </div>
                </div>
              `).join('')}
              
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin-top: 25px;">
                <h3 style="color: #0369a1; margin-top: 0;">💡 Quick Tips</h3>
                <ul style="color: #0369a1; margin: 0;">
                  <li>Each management link is valid for 7 days</li>
                  <li>You can edit event details, add steps, and send reminders</li>
                  <li>Track progress and view completion history</li>
                  <li>All changes are automatically saved</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6c757d; font-size: 14px;">
                  This email was sent by <strong>GitDone</strong> - Git-like sequence proof for physical world workflows
                </p>
              </div>
            </div>
          </div>
        `;

        const textBody = `
📋 YOUR EVENT MANAGEMENT LINKS

You have ${events.length} event${events.length > 1 ? 's' : ''} to manage:

${managementLinks.map((link, index) => `
${index + 1}. ${link.event_name}
   Event ID: ${link.event_id}
   Status: ${link.status.toUpperCase()}
   Progress: ${link.completed_steps}/${link.steps_count} steps
   Management Link: ${link.management_link}
`).join('\n')}

💡 QUICK TIPS:
- Each management link is valid for 7 days
- You can edit event details, add steps, and send reminders
- Track progress and view completion history
- All changes are automatically saved

This email was sent by GitDone - Git-like sequence proof for physical world workflows
        `;

        await emailService.sendEmail(
          owner_email,
          `📋 Your Event Management Links (${events.length} event${events.length > 1 ? 's' : ''})`,
          htmlBody,
          textBody
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ 
      success: true, 
      message: `Management links sent for ${events.length} event${events.length > 1 ? 's' : ''}`,
      events_found: events.length,
      events: managementLinks.map(link => ({
        event_id: link.event_id,
        event_name: link.event_name,
        status: link.status,
        progress: `${link.completed_steps}/${link.steps_count}`
      }))
    });
  } catch (error) {
    console.error('Error sending management links:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/manage/send-link - Send management link to event owner (legacy endpoint)
router.post('/send-link', async (req, res) => {
  try {
    const { event_id, owner_email } = req.body;
    
    if (!event_id || !owner_email) {
      return res.status(400).json({ error: 'Missing required fields: event_id, owner_email' });
    }
    
    // Read event to validate
    const eventPath = path.join(EVENTS_DIR, `${event_id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    if (event.owner_email !== owner_email) {
      return res.status(403).json({ error: 'Email does not match event owner' });
    }
    
    // Generate management token
    const token = jwt.sign(
      {
        event_id,
        owner_email,
        purpose: 'event_management',
        permissions: ['view', 'edit', 'add_steps', 'send_reminders']
      },
      process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      { expiresIn: '7 days' }
    );
    
    const managementLink = `${process.env.BASE_URL || 'http://localhost:3000'}/manage/${token}`;
    
    // Store token for tracking
    await ensureManagementTokensFile();
    const tokensData = await loadManagementTokens();
    tokensData.tokens[token] = {
      event_id,
      owner_email,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      used: false,
      permissions: ['view', 'edit', 'add_steps', 'send_reminders']
    };
    await saveManagementTokens(tokensData);
    
    // Send email if email service is configured
    if (emailService) {
      try {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Manage Your Event</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Event:</strong> ${event.name}</p>
              <p><strong>Status:</strong> ${event.status}</p>
              <p><strong>Steps:</strong> ${event.steps.length} total</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${managementLink}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Manage Event
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link allows you to view, edit, and manage your event. It will expire in 7 days.
            </p>
          </div>
        `;

        const textBody = `
Manage Your Event

Event: ${event.name}
Status: ${event.status}
Steps: ${event.steps.length} total

Click here to manage: ${managementLink}

This link allows you to view, edit, and manage your event. It will expire in 7 days.
        `;

        await emailService.sendEmail(
          owner_email,
          `Manage Your Event: ${event.name}`,
          htmlBody,
          textBody
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Management link sent',
      management_link: managementLink // For testing purposes
    });
  } catch (error) {
    console.error('Error sending management link:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/manage/:token - Validate management token and get event info
router.get('/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
    } catch (error) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid or expired token' 
      });
    }
    
    // Check token in our tracking system
    const tokensData = await loadManagementTokens();
    const tokenData = tokensData.tokens[token];
    
    if (!tokenData || tokenData.used) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Token already used or not found' 
      });
    }
    
    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Token expired' 
      });
    }
    
    // Get event info
    const eventPath = path.join(EVENTS_DIR, `${decoded.event_id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    res.json({
      valid: true,
      event_info: {
        id: event.id,
        name: event.name,
        owner_email: event.owner_email,
        flow_type: event.flow_type,
        status: event.status,
        created_at: event.created_at,
        completed_at: event.completed_at,
        steps: event.steps,
        commits: event.commits,
        permissions: decoded.permissions
      }
    });
  } catch (error) {
    console.error('Error validating management token:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Internal server error' 
    });
  }
});

// PUT /api/manage/:token - Update event
router.put('/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const { name, steps, flow_type } = req.body;
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
    
    // Check token permissions
    if (!decoded.permissions.includes('edit')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }
    
    // Read and update event
    const eventPath = path.join(EVENTS_DIR, `${decoded.event_id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    // Update event
    if (name) event.name = name;
    if (flow_type) event.flow_type = flow_type;
    if (steps) {
      // Update existing steps or add new ones
      event.steps = steps.map((step, index) => ({
        id: step.id || uuidv4(),
        name: step.name,
        vendor_email: step.vendor_email,
        status: step.status || 'pending',
        required_previous: step.required_previous || null,
        time_limit: step.time_limit || null,
        description: step.description || '',
        sequence: step.sequence || (index + 1),
        created_at: step.created_at || new Date().toISOString(),
        completed_at: step.completed_at || null,
        completion_comments: step.completion_comments || '',
        files: step.files || []
      }));
    }
    
    event.updated_at = new Date().toISOString();
    
    // Save updated event
    await fs.writeFile(eventPath, JSON.stringify(event, null, 2));
    
    res.json({
      success: true,
      message: 'Event updated successfully',
      event: event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/manage/:token/steps - Add new step to event
router.post('/:token/steps', async (req, res) => {
  try {
    const token = req.params.token;
    const { name, vendor_email, description, time_limit, sequence } = req.body;
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
    
    // Check token permissions
    if (!decoded.permissions.includes('add_steps')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }
    
    if (!name || !vendor_email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, vendor_email' 
      });
    }
    
    // Read and update event
    const eventPath = path.join(EVENTS_DIR, `${decoded.event_id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    // Add new step
    const newStep = {
      id: uuidv4(),
      name,
      vendor_email,
      status: 'pending',
      required_previous: null, // Will be calculated based on flow type
      time_limit: time_limit || null,
      description: description || '',
      sequence: sequence || (event.steps.length + 1),
      created_at: new Date().toISOString()
    };
    
    event.steps.push(newStep);
    event.updated_at = new Date().toISOString();
    
    // Save updated event
    await fs.writeFile(eventPath, JSON.stringify(event, null, 2));
    
    res.json({
      success: true,
      message: 'Step added successfully',
      step: newStep
    });
  } catch (error) {
    console.error('Error adding step:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;