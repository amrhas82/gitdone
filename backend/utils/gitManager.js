const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');

class GitManager {
  constructor(eventId) {
    this.repoPath = path.join(__dirname, '../../data/git_repos', eventId);
    this.git = simpleGit(this.repoPath);
  }

  async initialize() {
    try {
      await fs.mkdir(this.repoPath, { recursive: true });
      await this.git.init();
      
      // Configure git user
      await this.git.addConfig('user.name', process.env.GIT_USER_NAME || 'GitDone System');
      await this.git.addConfig('user.email', process.env.GIT_USER_EMAIL || 'system@gitdone.com');
      
      // Create initial structure
      const readmeContent = `# GitDone Event Repository

This repository tracks the workflow for: ${eventId}

## Event Information
- Event ID: ${eventId}
- Created: ${new Date().toISOString()}
- Repository initialized by GitDone System

## Structure
- \`steps/\` - Contains completed step data
- \`files/\` - Contains uploaded files
- \`metadata/\` - Contains step metadata

Each step completion creates a new commit with the vendor's files and comments.
`;
      
      await fs.writeFile(
        path.join(this.repoPath, 'README.md'),
        readmeContent
      );
      
      await this.git.add('./*');
      await this.git.commit('Initial event setup');
      
      return true;
    } catch (error) {
      console.error('Git initialization failed:', error);
      return false;
    }
  }

  async commitStep(stepData, files, comments) {
    try {
      // Create step directory
      const stepDir = path.join(this.repoPath, 'steps', stepData.id);
      await fs.mkdir(stepDir, { recursive: true });
      
      // Create files directory for this step
      const filesDir = path.join(stepDir, 'files');
      await fs.mkdir(filesDir, { recursive: true });
      
      // Write uploaded files
      const fileList = [];
      for (const file of files) {
        const filePath = path.join(filesDir, file.fileName);
        await fs.writeFile(filePath, file.buffer);
        fileList.push(file.fileName);
      }
      
      // Create metadata file
      const metadata = {
        step: {
          id: stepData.id,
          name: stepData.name,
          vendor_email: stepData.vendor_email,
          description: stepData.description,
          time_limit: stepData.time_limit
        },
        completion: {
          completed_at: new Date().toISOString(),
          files: fileList,
          comments: comments || '',
          file_count: files.length
        },
        event: {
          event_id: stepData.event_id,
          flow_type: stepData.flow_type
        }
      };
      
      await fs.writeFile(
        path.join(stepDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // Create step summary
      const summaryContent = `# Step Completion: ${stepData.name}

**Vendor:** ${stepData.vendor_email}
**Completed:** ${new Date().toISOString()}
**Files:** ${files.length} files uploaded
**Comments:** ${comments || 'No comments provided'}

## Files Uploaded
${fileList.map(file => `- ${file}`).join('\n')}

## Metadata
See \`metadata.json\` for complete step information.
`;
      
      await fs.writeFile(
        path.join(stepDir, 'SUMMARY.md'),
        summaryContent
      );
      
      // Git commit
      await this.git.add('./*');
      const commit = await this.git.commit(
        `STEP_COMPLETE: ${stepData.name}\n\nVendor: ${stepData.vendor_email}\nFiles: ${files.length}\nComments: ${comments || 'No comments'}`
      );
      
      return commit.commit;
    } catch (error) {
      console.error('Git commit failed:', error);
      throw error;
    }
  }

  async getCommitHistory() {
    try {
      const log = await this.git.log();
      return log.all;
    } catch (error) {
      console.error('Error getting commit history:', error);
      return [];
    }
  }

  async getStepCommits(stepId) {
    try {
      const log = await this.git.log();
      return log.all.filter(commit => 
        commit.message.includes(`STEP_COMPLETE:`) && 
        commit.message.includes(stepId)
      );
    } catch (error) {
      console.error('Error getting step commits:', error);
      return [];
    }
  }

  async getFileHistory(fileName) {
    try {
      const log = await this.git.log({ file: fileName });
      return log.all;
    } catch (error) {
      console.error('Error getting file history:', error);
      return [];
    }
  }

  async createBranch(branchName) {
    try {
      await this.git.checkoutLocalBranch(branchName);
      return true;
    } catch (error) {
      console.error('Error creating branch:', error);
      return false;
    }
  }

  async switchBranch(branchName) {
    try {
      await this.git.checkout(branchName);
      return true;
    } catch (error) {
      console.error('Error switching branch:', error);
      return false;
    }
  }

  async getBranches() {
    try {
      const branches = await this.git.branch();
      return branches.all;
    } catch (error) {
      console.error('Error getting branches:', error);
      return [];
    }
  }

  async getRepositoryInfo() {
    try {
      const status = await this.git.status();
      const branches = await this.git.branch();
      const log = await this.git.log({ maxCount: 1 });
      
      return {
        current_branch: status.current,
        branches: branches.all,
        last_commit: log.latest,
        is_clean: status.isClean()
      };
    } catch (error) {
      console.error('Error getting repository info:', error);
      return null;
    }
  }
}

module.exports = GitManager;