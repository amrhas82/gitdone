const EmailService = require('./emailService');

class CompletionEmailService {
  constructor() {
    this.emailService = new EmailService();
  }

  async sendEventCompletionEmail(event, gitHash = null) {
    try {
      const eventDuration = this.calculateEventDuration(event);
      const stepSummary = this.generateStepSummary(event);
      const gitInfo = gitHash ? this.generateGitInfo(gitHash) : '';
      const timelineWithHashes = this.generateTimelineWithHashes(event);
      const jsonExport = this.generateJsonExport(event);

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Event Completed Successfully!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${event.name}</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Event Summary -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #333; margin-top: 0;">📊 Event Summary</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong>Event Duration:</strong><br>
                  <span style="color: #28a745; font-size: 18px;">${eventDuration}</span>
                </div>
                <div>
                  <strong>Steps Completed:</strong><br>
                  <span style="color: #007bff; font-size: 18px;">${event.steps.length}/${event.steps.length}</span>
                </div>
                <div>
                  <strong>Total Files:</strong><br>
                  <span style="color: #6f42c1; font-size: 18px;">${this.getTotalFiles(event)}</span>
                </div>
                <div>
                  <strong>Completion Rate:</strong><br>
                  <span style="color: #28a745; font-size: 18px;">100%</span>
                </div>
              </div>
            </div>

            <!-- Git Information -->
            ${gitInfo ? `
            <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #333; margin-top: 0;">🔗 Git Repository</h3>
              <p style="margin: 0; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                <strong>Repository Hash:</strong> ${gitHash}<br>
                <strong>Location:</strong> data/git_repos/${event.id}/<br>
                <strong>Commits:</strong> ${event.commits.length} step completions
              </p>
            </div>
            ` : ''}

            <!-- Step Details -->
            <h2 style="color: #333;">📋 Step Completion Details</h2>
            ${stepSummary}
            
            <!-- Timeline with Hashes -->
            <h2 style="color: #333; margin-top: 30px;">⏱️ Completion Timeline with Git Hashes</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              ${timelineWithHashes}
            </div>

            <!-- JSON Export -->
            <h2 style="color: #333; margin-top: 30px;">📄 Complete Event Data (JSON)</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <p style="margin: 0 0 15px 0; color: #666;">Complete event data for records and integration:</p>
              <pre style="background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; overflow-x: auto; font-size: 12px; max-height: 300px;">${jsonExport}</pre>
            </div>

            <!-- Next Steps -->
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-top: 25px;">
              <h3 style="color: #155724; margin-top: 0;">✅ What's Next?</h3>
              <ul style="color: #155724; margin: 0;">
                <li>All deliverables have been completed and verified</li>
                <li>Files are securely stored and compressed</li>
                <li>Complete audit trail available in Git repository</li>
                <li>Event data can be exported for records</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px;">
                This event was managed by <strong>GitDone</strong> - Git-like sequence proof for physical world workflows
              </p>
            </div>
          </div>
        </div>
      `;

      const textBody = `
🎉 EVENT COMPLETED SUCCESSFULLY!

Event: ${event.name}
Duration: ${eventDuration}
Steps Completed: ${event.steps.length}/${event.steps.length} (100%)
Total Files: ${this.getTotalFiles(event)}

${gitInfo ? `
GIT REPOSITORY:
Repository Hash: ${gitHash}
Location: data/git_repos/${event.id}/
Commits: ${event.commits.length} step completions

` : ''}STEP COMPLETION DETAILS:
${this.generateTextStepSummary(event)}

TIMELINE:
${this.generateTextTimeline(event)}

✅ WHAT'S NEXT?
- All deliverables have been completed and verified
- Files are securely stored and compressed  
- Complete audit trail available in Git repository
- Event data can be exported for records

This event was managed by GitDone - Git-like sequence proof for physical world workflows
      `;

      await this.emailService.sendEmail(
        event.owner_email,
        `🎉 Event Complete: ${event.name}`,
        htmlBody,
        textBody
      );

      return { success: true, message: 'Completion email sent successfully' };
    } catch (error) {
      console.error('Error sending completion email:', error);
      throw error;
    }
  }

  calculateEventDuration(event) {
    const start = new Date(event.created_at);
    const end = new Date(event.completed_at);
    const duration = end - start;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} minutes`;
    }
  }

  generateStepSummary(event) {
    return event.steps.map((step, index) => {
      const completionTime = new Date(step.completed_at).toLocaleString();
      const filesCount = step.files ? step.files.length : 0;
      
      return `
        <div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #333;">Step ${index + 1}: ${step.name}</h3>
            <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✅ Completed</span>
          </div>
          <p style="margin: 5px 0; color: #666;"><strong>Vendor:</strong> ${step.vendor_email}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Completed:</strong> ${completionTime}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Files:</strong> ${filesCount} uploaded</p>
          ${step.completion_comments ? `<p style="margin: 5px 0; color: #666;"><strong>Comments:</strong> ${step.completion_comments}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  generateTextStepSummary(event) {
    return event.steps.map((step, index) => {
      const completionTime = new Date(step.completed_at).toLocaleString();
      const filesCount = step.files ? step.files.length : 0;
      
      return `
Step ${index + 1}: ${step.name}
  Vendor: ${step.vendor_email}
  Completed: ${completionTime}
  Files: ${filesCount} uploaded
  ${step.completion_comments ? `Comments: ${step.completion_comments}` : ''}
      `;
    }).join('\n');
  }

  generateTimeline(event) {
    const commits = event.commits.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return commits.map((commit, index) => {
      const step = event.steps.find(s => s.id === commit.step_id);
      const time = new Date(commit.timestamp).toLocaleString();
      
      return `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <div style="width: 30px; height: 30px; background: #28a745; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">
            ${index + 1}
          </div>
          <div>
            <strong>${step.name}</strong> completed by ${commit.vendor_email}<br>
            <small style="color: #666;">${time} • ${commit.files.length} files • ${commit.comments || 'No comments'}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  generateTextTimeline(event) {
    const commits = event.commits.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return commits.map((commit, index) => {
      const step = event.steps.find(s => s.id === commit.step_id);
      const time = new Date(commit.timestamp).toLocaleString();
      
      return `${index + 1}. ${step.name} - ${commit.vendor_email} (${time}) - ${commit.files.length} files`;
    }).join('\n');
  }

  generateGitInfo(gitHash) {
    return `
      <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="color: #333; margin-top: 0;">🔗 Git Repository</h3>
        <p style="margin: 0; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px;">
          <strong>Repository Hash:</strong> ${gitHash}<br>
          <strong>Location:</strong> data/git_repos/${event.id}/<br>
          <strong>Commits:</strong> ${event.commits.length} step completions
        </p>
      </div>
    `;
  }

  getTotalFiles(event) {
    return event.steps.reduce((total, step) => {
      return total + (step.files ? step.files.length : 0);
    }, 0);
  }

  generateTimelineWithHashes(event) {
    const commits = event.commits.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return commits.map((commit, index) => {
      const step = event.steps.find(s => s.id === commit.step_id);
      const time = new Date(commit.timestamp).toLocaleString();
      const duration = index > 0 ? this.calculateStepDuration(commits[index - 1].timestamp, commit.timestamp) : 'Start';
      
      return `
        <div style="display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #28a745;">
          <div style="width: 30px; height: 30px; background: #28a745; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">
            ${index + 1}
          </div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 5px;">
              <strong style="color: #333;">${step.name}</strong>
              <span style="background: #007bff; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${duration}</span>
            </div>
            <div style="font-size: 13px; color: #666;">
              <strong>Vendor:</strong> ${commit.vendor_email}<br>
              <strong>Time:</strong> ${time}<br>
              <strong>Files:</strong> ${commit.files.length} uploaded<br>
              <strong>Git Hash:</strong> <code style="background: #f8f9fa; padding: 2px 4px; border-radius: 2px;">${commit.commit_hash}</code><br>
              ${commit.comments ? `<strong>Comments:</strong> ${commit.comments}` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  generateJsonExport(event) {
    // Create a clean export version
    const exportData = {
      event: {
        id: event.id,
        name: event.name,
        owner_email: event.owner_email,
        flow_type: event.flow_type,
        created_at: event.created_at,
        completed_at: event.completed_at,
        duration: this.calculateEventDuration(event),
        status: event.status
      },
      summary: {
        total_steps: event.steps.length,
        completed_steps: event.steps.filter(s => s.status === 'completed').length,
        total_files: this.getTotalFiles(event),
        completion_rate: 100
      },
      steps: event.steps.map(step => ({
        id: step.id,
        name: step.name,
        vendor_email: step.vendor_email,
        status: step.status,
        description: step.description,
        time_limit: step.time_limit,
        created_at: step.created_at,
        completed_at: step.completed_at,
        completion_comments: step.completion_comments,
        files: step.files ? step.files.map(file => ({
          original_name: file.originalName,
          file_name: file.fileName,
          size: file.size,
          type: file.type,
          processed: file.processed
        })) : []
      })),
      commits: event.commits.map(commit => ({
        commit_hash: commit.commit_hash,
        step_id: commit.step_id,
        step_name: event.steps.find(s => s.id === commit.step_id)?.name,
        vendor_email: commit.vendor_email,
        timestamp: commit.timestamp,
        files: commit.files,
        comments: commit.comments,
        parent_hash: commit.parent_hash
      })),
      timeline: this.generateTimelineData(event),
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: 'GitDone System',
        version: '1.0'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  generateTimelineData(event) {
    const commits = event.commits.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return commits.map((commit, index) => {
      const step = event.steps.find(s => s.id === commit.step_id);
      const duration = index > 0 ? this.calculateStepDuration(commits[index - 1].timestamp, commit.timestamp) : 'Start';
      
      return {
        sequence: index + 1,
        step_name: step.name,
        vendor_email: commit.vendor_email,
        timestamp: commit.timestamp,
        duration: duration,
        commit_hash: commit.commit_hash,
        files_count: commit.files.length,
        comments: commit.comments
      };
    });
  }

  calculateStepDuration(previousTimestamp, currentTimestamp) {
    const prev = new Date(previousTimestamp);
    const curr = new Date(currentTimestamp);
    const diff = curr - prev;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = CompletionEmailService;