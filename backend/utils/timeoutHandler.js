const fs = require('fs').promises;
const path = require('path');

const EVENTS_DIR = path.join(__dirname, '../../data/events');
const TOKENS_FILE = path.join(__dirname, '../../data/magic_tokens.json');

class TimeoutHandler {
  constructor() {
    this.timeoutIntervals = new Map(); // Store timeout intervals by step ID
  }

  // Start monitoring a step for timeout
  async startStepTimeout(eventId, stepId, vendorEmail, timeLimit) {
    try {
      // Clear any existing timeout for this step
      this.clearStepTimeout(stepId);

      if (!timeLimit) {
        console.log(`No time limit set for step ${stepId}, skipping timeout monitoring`);
        return;
      }

      const timeoutMs = this.parseTimeLimit(timeLimit);
      console.log(`Starting timeout monitoring for step ${stepId}: ${timeLimit} (${timeoutMs}ms)`);

      const timeoutId = setTimeout(async () => {
        try {
          await this.handleStepTimeout(eventId, stepId, vendorEmail);
        } catch (error) {
          console.error(`Error handling timeout for step ${stepId}:`, error);
        }
      }, timeoutMs);

      this.timeoutIntervals.set(stepId, timeoutId);
      console.log(`✅ Timeout set for step ${stepId}: ${timeLimit}`);
    } catch (error) {
      console.error(`Error starting timeout for step ${stepId}:`, error);
    }
  }

  // Clear timeout monitoring for a step
  clearStepTimeout(stepId) {
    const timeoutId = this.timeoutIntervals.get(stepId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutIntervals.delete(stepId);
      console.log(`Cleared timeout for step ${stepId}`);
    }
  }

  // Handle step timeout
  async handleStepTimeout(eventId, stepId, vendorEmail) {
    try {
      console.log(`⏰ Step ${stepId} timed out for vendor ${vendorEmail}`);

      // Read event data
      const eventPath = path.join(EVENTS_DIR, `${eventId}.json`);
      const eventData = await fs.readFile(eventPath, 'utf8');
      const event = JSON.parse(eventData);

      const step = event.steps.find(s => s.id === stepId);
      if (!step) {
        console.error(`Step ${stepId} not found in event ${eventId}`);
        return;
      }

      // Check if step is still pending (not completed)
      if (step.status !== 'pending') {
        console.log(`Step ${stepId} is no longer pending (status: ${step.status}), skipping timeout handling`);
        return;
      }

      // Mark step as timed out
      step.status = 'timed_out';
      step.timed_out_at = new Date().toISOString();
      step.timeout_reason = 'Step exceeded time limit';

      // Save updated event
      await fs.writeFile(eventPath, JSON.stringify(event, null, 2));

      console.log(`✅ Step ${stepId} marked as timed out`);

      // For sequential flows, trigger the next step
      if (event.flow_type === 'sequential') {
        await this.triggerNextStepAfterTimeout(event);
      }

      // Send timeout notification email to event owner
      await this.sendTimeoutNotification(event, step);

    } catch (error) {
      console.error(`Error handling timeout for step ${stepId}:`, error);
    }
  }

  // Trigger next step after timeout
  async triggerNextStepAfterTimeout(event) {
    try {
      const completedSteps = event.steps.filter(step => 
        step.status === 'completed' || step.status === 'timed_out'
      );
      const nextStep = event.steps.find(step => 
        step.status === 'pending' && 
        step.sequence === completedSteps.length + 1
      );

      if (nextStep) {
        console.log(`Triggering next step after timeout: ${nextStep.name} for vendor: ${nextStep.vendor_email}`);
        
        // Import MagicLinkService here to avoid circular dependency
        const MagicLinkService = require('./magicLinkService');
        const magicLinkService = new MagicLinkService();
        await magicLinkService.sendMagicLink(event.id, nextStep.id, nextStep.vendor_email);
        
        // Start timeout monitoring for the next step
        await this.startStepTimeout(event.id, nextStep.id, nextStep.vendor_email, nextStep.time_limit);
        
        console.log(`✅ Next step triggered after timeout: ${nextStep.name}`);
      } else {
        console.log('No next step to trigger after timeout');
      }
    } catch (error) {
      console.error('Error triggering next step after timeout:', error);
    }
  }

  // Send timeout notification email
  async sendTimeoutNotification(event, timedOutStep) {
    try {
      const EmailService = require('./emailService');
      const emailService = new EmailService();

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">⚠️ Step Timed Out</h2>
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Event:</strong> ${event.name}</p>
            <p><strong>Event ID:</strong> ${event.id}</p>
            <p><strong>Timed Out Step:</strong> ${timedOutStep.name}</p>
            <p><strong>Vendor:</strong> ${timedOutStep.vendor_email}</p>
            <p><strong>Time Limit:</strong> ${timedOutStep.time_limit}</p>
            <p><strong>Timed Out At:</strong> ${new Date(timedOutStep.timed_out_at).toLocaleString()}</p>
          </div>
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px;">
            <h3 style="color: #0c5460; margin-top: 0;">What Happens Next?</h3>
            <p style="color: #0c5460; margin: 0;">
              ${event.flow_type === 'sequential' 
                ? 'The next step in sequence has been automatically triggered.'
                : 'You may need to manually trigger the next step or reassign this step.'
              }
            </p>
          </div>
        </div>
      `;

      const textBody = `
⚠️ STEP TIMED OUT

Event: ${event.name}
Event ID: ${event.id}
Timed Out Step: ${timedOutStep.name}
Vendor: ${timedOutStep.vendor_email}
Time Limit: ${timedOutStep.time_limit}
Timed Out At: ${new Date(timedOutStep.timed_out_at).toLocaleString()}

WHAT HAPPENS NEXT?
${event.flow_type === 'sequential' 
  ? 'The next step in sequence has been automatically triggered.'
  : 'You may need to manually trigger the next step or reassign this step.'
}
      `;

      await emailService.sendEmail(
        event.owner_email,
        `⚠️ Step Timed Out: ${timedOutStep.name} for ${event.name}`,
        htmlBody,
        textBody
      );

      console.log(`✅ Timeout notification sent to event owner: ${event.owner_email}`);
    } catch (error) {
      console.error('Error sending timeout notification:', error);
    }
  }

  // Parse time limit string to milliseconds
  parseTimeLimit(timeLimit) {
    const units = {
      'm': 60 * 1000,           // minutes
      'h': 60 * 60 * 1000,      // hours
      'd': 24 * 60 * 60 * 1000, // days
      'w': 7 * 24 * 60 * 60 * 1000 // weeks
    };
    
    // Handle formats like "30m", "2h", "1d", "1w"
    const match = timeLimit.match(/^(\d+)([mhdw])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      return value * units[unit];
    }
    
    // Handle formats like "30 minutes", "2 hours", "1 day", "1 week"
    const textMatch = timeLimit.match(/^(\d+)\s*(minutes?|hours?|days?|weeks?)$/i);
    if (textMatch) {
      const value = parseInt(textMatch[1]);
      const unit = textMatch[2].toLowerCase();
      const unitMap = {
        'minute': 'm', 'minutes': 'm',
        'hour': 'h', 'hours': 'h',
        'day': 'd', 'days': 'd',
        'week': 'w', 'weeks': 'w'
      };
      const shortUnit = unitMap[unit];
      return value * units[shortUnit];
    }
    
    // Default to 30 days if can't parse
    console.warn(`Could not parse time limit: ${timeLimit}, defaulting to 30 days`);
    return 30 * units['d'];
  }

  // Clean up all timeouts
  cleanup() {
    for (const [stepId, timeoutId] of this.timeoutIntervals) {
      clearTimeout(timeoutId);
    }
    this.timeoutIntervals.clear();
    console.log('All timeouts cleaned up');
  }
}

module.exports = TimeoutHandler;