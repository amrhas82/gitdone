const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const GitManager = require('../utils/gitManager');
const CompletionEmailService = require('../utils/completionEmail');
const MagicLinkService = require('../utils/magicLinkService');
const TimeoutHandler = require('../utils/timeoutHandler');

const EVENTS_DIR = path.join(__dirname, '../../data/events');
const UPLOADS_DIR = path.join(__dirname, '../../data/uploads');
const TOKENS_FILE = path.join(__dirname, '../../data/magic_tokens.json');

// Trigger next step in sequential flow
async function triggerNextStep(event, eventId) {
  try {
    // Find the next pending step in sequence
    const completedSteps = event.steps.filter(step => step.status === 'completed');
    const nextStep = event.steps.find(step => 
      step.status === 'pending' && 
      step.sequence === completedSteps.length + 1
    );
    
    if (nextStep) {
      console.log(`Triggering next step: ${nextStep.name} for vendor: ${nextStep.vendor_email}`);
      
      // Use the magic link service
      const magicLinkService = new MagicLinkService();
      await magicLinkService.sendMagicLink(eventId, nextStep.id, nextStep.vendor_email);
      
      console.log(`✅ Magic link sent for next step: ${nextStep.name}`);
    } else {
      console.log('No next step to trigger');
    }
  } catch (error) {
    console.error('Error triggering next step:', error);
    throw error;
  }
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 25 * 1024 * 1024, // 25MB default
    files: 10 // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
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

// Process uploaded file
async function processUploadedFile(fileBuffer, originalName, mimetype) {
  const fileExt = path.extname(originalName).toLowerCase();
  const fileName = `${uuidv4()}${fileExt}`;
  
  // Image processing
  if (mimetype.startsWith('image/')) {
    try {
      const processedBuffer = await sharp(fileBuffer)
        .webp({ quality: 85 })
        .toBuffer();
      
      const processedFileName = `${uuidv4()}.webp`;
      await fs.writeFile(path.join(UPLOADS_DIR, processedFileName), processedBuffer);
      
      return {
        originalName,
        fileName: processedFileName,
        size: processedBuffer.length,
        type: 'image/webp',
        processed: true
      };
    } catch (error) {
      console.error('Image processing failed:', error);
      // Fallback to original
    }
  }
  
  // For other files, save as-is
  await fs.writeFile(path.join(UPLOADS_DIR, fileName), fileBuffer);
  
  return {
    originalName,
    fileName,
    size: fileBuffer.length,
    type: mimetype,
    processed: false
  };
}

// GET /api/complete/:token - Validate magic link and get step info
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
    const tokensData = await loadTokens();
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
    
    // Get event and step info
    const eventPath = path.join(EVENTS_DIR, `${decoded.event_id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    const step = event.steps.find(s => s.id === decoded.step_id);
    if (!step) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Step not found' 
      });
    }
    
    res.json({
      valid: true,
      step_info: {
        event_name: event.name,
        step_name: step.name,
        vendor_email: step.vendor_email,
        description: step.description,
        time_limit: step.time_limit,
        event_id: decoded.event_id,
        step_id: decoded.step_id
      }
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/complete/:token - Complete step with file uploads
router.post('/:token', upload.array('files', 10), async (req, res) => {
  try {
    const token = req.params.token;
    const { comments } = req.body;
    
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
    
    // Check token in our tracking system
    const tokensData = await loadTokens();
    const tokenData = tokensData.tokens[token];
    
    if (!tokenData || tokenData.used) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token already used or not found' 
      });
    }
    
    // Mark token as used
    tokenData.used = true;
    tokenData.used_at = new Date().toISOString();
    await saveTokens(tokensData);
    
    // Ensure uploads directory exists
    await ensureUploadsDir();
    
    // Process uploaded files
    const processedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const processedFile = await processUploadedFile(file.buffer, file.originalname, file.mimetype);
        processedFiles.push(processedFile);
      }
    }
    
    // Update event with completion
    const eventPath = path.join(EVENTS_DIR, `${decoded.event_id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    const step = event.steps.find(s => s.id === decoded.step_id);
    if (!step) {
      return res.status(404).json({ 
        success: false, 
        error: 'Step not found' 
      });
    }
    
    // Clear timeout for this step since it's being completed
    const timeoutHandler = new TimeoutHandler();
    timeoutHandler.clearStepTimeout(decoded.step_id);
    
    // Update step status
    step.status = 'completed';
    step.completed_at = new Date().toISOString();
    step.completion_comments = comments || '';
    step.files = processedFiles;
    
    // Create commit record
    const commit = {
      commit_hash: uuidv4(),
      step_id: decoded.step_id,
      vendor_email: decoded.vendor_email,
      timestamp: new Date().toISOString(),
      files: processedFiles.map(f => f.fileName),
      comments: comments || '',
      parent_hash: null // Will be set by git integration later
    };
    
    event.commits.push(commit);
    
    // Check if all steps are completed
    const allStepsCompleted = event.steps.every(s => s.status === 'completed');
    if (allStepsCompleted) {
      event.status = 'completed';
      event.completed_at = new Date().toISOString();
    }
    
    // Save updated event
    await fs.writeFile(eventPath, JSON.stringify(event, null, 2));
    
    // Integrate with Git repository
    try {
      const gitManager = new GitManager(decoded.event_id);
      
      // Initialize repo if it doesn't exist
      const repoInfo = await gitManager.getRepositoryInfo();
      if (!repoInfo) {
        await gitManager.initialize();
      }
      
      // Commit the step completion
      const gitCommitHash = await gitManager.commitStep(step, processedFiles, comments);
      commit.parent_hash = gitCommitHash;
      
      // Update the commit with git hash
      const updatedEvent = JSON.parse(await fs.readFile(eventPath, 'utf8'));
      const commitIndex = updatedEvent.commits.findIndex(c => c.commit_hash === commit.commit_hash);
      if (commitIndex !== -1) {
        updatedEvent.commits[commitIndex].parent_hash = gitCommitHash;
        await fs.writeFile(eventPath, JSON.stringify(updatedEvent, null, 2));
      }
    } catch (gitError) {
      console.error('Git integration failed:', gitError);
      // Don't fail the request if git fails
    }
    
    // Trigger next step if this is sequential flow
    if (event.flow_type === 'sequential' && !allStepsCompleted) {
      try {
        await triggerNextStep(event, decoded.event_id);
      } catch (triggerError) {
        console.error('Failed to trigger next step:', triggerError);
        // Don't fail the request if trigger fails
      }
    }
    
    // Send completion email if all steps are completed
    if (allStepsCompleted) {
      try {
        const completionEmailService = new CompletionEmailService();
        await completionEmailService.sendEventCompletionEmail(event, gitCommitHash);
        console.log('✅ Event completion email sent to organizer');
      } catch (emailError) {
        console.error('Failed to send completion email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({
      success: true,
      message: 'Step completed successfully',
      commit_hash: commit.commit_hash,
      files_uploaded: processedFiles.length,
      event_completed: allStepsCompleted
    });
  } catch (error) {
    console.error('Error completing step:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;