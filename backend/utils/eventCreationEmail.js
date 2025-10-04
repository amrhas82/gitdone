const EmailService = require('./emailService');

class EventCreationEmailService {
  constructor() {
    this.emailService = new EmailService();
  }

  async sendEventCreationEmail(event) {
    try {
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Event Created Successfully!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${event.name}</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Event Summary -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #333; margin-top: 0;">📊 Event Details</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong>Event ID:</strong><br>
                  <span style="color: #007bff; font-size: 16px; font-family: monospace;">${event.id}</span>
                </div>
                <div>
                  <strong>Flow Type:</strong><br>
                  <span style="color: #6f42c1; font-size: 16px;">${event.flow_type}</span>
                </div>
                <div>
                  <strong>Total Steps:</strong><br>
                  <span style="color: #28a745; font-size: 16px;">${event.steps.length}</span>
                </div>
                <div>
                  <strong>Created:</strong><br>
                  <span style="color: #6c757d; font-size: 16px;">${new Date(event.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <!-- Steps Overview -->
            <h2 style="color: #333;">📋 Steps Overview</h2>
            ${event.steps.map((step, index) => `
              <div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                  <h3 style="margin: 0; color: #333;">Step ${index + 1}: ${step.name}</h3>
                  <span style="background: #ffc107; color: #212529; padding: 4px 8px; border-radius: 4px; font-size: 12px;">⏳ Pending</span>
                </div>
                <p style="margin: 5px 0; color: #666;"><strong>Vendor:</strong> ${step.vendor_email}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Description:</strong> ${step.description || 'No description provided'}</p>
                ${step.time_limit ? `<p style="margin: 5px 0; color: #666;"><strong>Time Limit:</strong> ${step.time_limit}</p>` : ''}
              </div>
            `).join('')}

            <!-- Management Information -->
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin-top: 25px;">
              <h3 style="color: #0c5460; margin-top: 0;">🔧 Event Management</h3>
              <p style="color: #0c5460; margin: 0;">
                <strong>Event ID:</strong> ${event.id}<br>
                <strong>Your Email:</strong> ${event.owner_email}<br>
                <br>
                Use these details to manage your event or send management links to edit it later.
              </p>
            </div>

            <!-- Next Steps -->
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-top: 25px;">
              <h3 style="color: #155724; margin-top: 0;">✅ What's Next?</h3>
              <ul style="color: #155724; margin: 0;">
                <li>Magic links have been sent to all vendors for their respective steps</li>
                <li>Vendors will receive email notifications with their unique completion links</li>
                <li>You can track progress and send reminders from the event dashboard</li>
                <li>You'll receive a completion email when all steps are finished</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px;">
                This event was created with <strong>GitDone</strong> - Git-like sequence proof for physical world workflows
              </p>
            </div>
          </div>
        </div>
      `;

      const textBody = `
🎉 EVENT CREATED SUCCESSFULLY!

Event: ${event.name}
Event ID: ${event.id}
Flow Type: ${event.flow_type}
Total Steps: ${event.steps.length}
Created: ${new Date(event.created_at).toLocaleString()}

STEPS OVERVIEW:
${event.steps.map((step, index) => `
Step ${index + 1}: ${step.name}
  Vendor: ${step.vendor_email}
  Description: ${step.description || 'No description provided'}
  ${step.time_limit ? `Time Limit: ${step.time_limit}` : ''}
  Status: Pending
`).join('')}

EVENT MANAGEMENT:
Event ID: ${event.id}
Your Email: ${event.owner_email}

Use these details to manage your event or send management links to edit it later.

✅ WHAT'S NEXT?
- Magic links have been sent to all vendors for their respective steps
- Vendors will receive email notifications with their unique completion links
- You can track progress and send reminders from the event dashboard
- You'll receive a completion email when all steps are finished

This event was created with GitDone - Git-like sequence proof for physical world workflows
      `;

      await this.emailService.sendEmail(
        event.owner_email,
        `🎉 Event Created: ${event.name}`,
        htmlBody,
        textBody
      );

      return { success: true, message: 'Event creation email sent successfully' };
    } catch (error) {
      console.error('Error sending event creation email:', error);
      throw error;
    }
  }
}

module.exports = EventCreationEmailService;