const fs = require('fs-extra');
const path = require('path');

class FileManager {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.eventsDir = path.join(this.dataDir, 'events');
    this.gitReposDir = path.join(this.dataDir, 'git_repos');
    this.uploadsDir = path.join(this.dataDir, 'uploads');
    
    this.ensureDirectories();
  }

  async ensureDirectories() {
    await fs.ensureDir(this.eventsDir);
    await fs.ensureDir(this.gitReposDir);
    await fs.ensureDir(this.uploadsDir);
  }

  // Event file operations
  async saveEvent(event) {
    const filePath = path.join(this.eventsDir, `${event.id}.json`);
    await fs.writeJson(filePath, event, { spaces: 2 });
    return filePath;
  }

  async loadEvent(eventId) {
    const filePath = path.join(this.eventsDir, `${eventId}.json`);
    try {
      return await fs.readJson(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Event not found');
      }
      throw error;
    }
  }

  async listEvents() {
    try {
      const files = await fs.readdir(this.eventsDir);
      const events = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const eventId = file.replace('.json', '');
          const event = await this.loadEvent(eventId);
          events.push(event);
        }
      }
      
      return events;
    } catch (error) {
      return [];
    }
  }

  async deleteEvent(eventId) {
    const filePath = path.join(this.eventsDir, `${eventId}.json`);
    await fs.remove(filePath);
    
    // Also remove git repo
    const gitRepoPath = path.join(this.gitReposDir, eventId);
    await fs.remove(gitRepoPath);
  }

  // Analytics
  async loadAnalytics() {
    const analyticsPath = path.join(this.dataDir, 'analytics.json');
    try {
      return await fs.readJson(analyticsPath);
    } catch (error) {
      return {
        events: {
          total_created: 0,
          by_flow_type: { sequential: 0, non_sequential: 0 },
          completion_rate: 0.0
        },
        steps: {
          total_assigned: 0,
          completion_rate: 0.0,
          average_completion_time: 0,
          photo_upload_rate: 0.0
        },
        vendors: {
          unique_vendors: 0,
          average_steps_per_vendor: 0.0
        },
        system: {
          magic_links_sent: 0,
          magic_links_used: 0,
          file_uploads: 0,
          error_rate: 0.0
        }
      };
    }
  }

  async saveAnalytics(analytics) {
    const analyticsPath = path.join(this.dataDir, 'analytics.json');
    await fs.writeJson(analyticsPath, analytics, { spaces: 2 });
  }

  // Magic tokens
  async loadMagicTokens() {
    const tokensPath = path.join(this.dataDir, 'magic_tokens.json');
    try {
      return await fs.readJson(tokensPath);
    } catch (error) {
      return { tokens: {} };
    }
  }

  async saveMagicTokens(tokens) {
    const tokensPath = path.join(this.dataDir, 'magic_tokens.json');
    await fs.writeJson(tokensPath, tokens, { spaces: 2 });
  }

  // File upload operations
  async saveUploadedFile(fileBuffer, fileName, eventId, stepId) {
    const uploadDir = path.join(this.uploadsDir, eventId, stepId);
    await fs.ensureDir(uploadDir);
    
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, fileBuffer);
    
    return filePath;
  }

  async getUploadedFiles(eventId, stepId) {
    const uploadDir = path.join(this.uploadsDir, eventId, stepId);
    try {
      const files = await fs.readdir(uploadDir);
      return files.map(file => ({
        name: file,
        path: path.join(uploadDir, file)
      }));
    } catch (error) {
      return [];
    }
  }
}

module.exports = FileManager;