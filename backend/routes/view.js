const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const EVENTS_DIR = path.join(__dirname, '../../data/events');
const UPLOADS_DIR = path.join(__dirname, '../../data/uploads');

// GET /api/view/:eventId - Get read-only event view
router.get('/:eventId', async (req, res) => {
  try {
    const eventPath = path.join(EVENTS_DIR, `${req.params.eventId}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    // Calculate progress
    const completedSteps = event.steps.filter(step => step.status === 'completed').length;
    const totalSteps = event.steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    
    // Create timeline from commits
    const timeline = event.commits.map(commit => ({
      ...commit,
      step: event.steps.find(s => s.id === commit.step_id)
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Prepare response (exclude sensitive info)
    const publicEvent = {
      id: event.id,
      name: event.name,
      flow_type: event.flow_type,
      status: event.status,
      created_at: event.created_at,
      completed_at: event.completed_at,
      progress: Math.round(progress),
      completed_steps: completedSteps,
      total_steps: totalSteps,
      steps: event.steps.map(step => ({
        id: step.id,
        name: step.name,
        status: step.status,
        description: step.description,
        time_limit: step.time_limit,
        created_at: step.created_at,
        completed_at: step.completed_at,
        // Don't expose vendor emails in public view
        vendor_email: step.status === 'completed' ? step.vendor_email : '***@***.***'
      })),
      timeline,
      commits: event.commits.map(commit => ({
        commit_hash: commit.commit_hash,
        step_id: commit.step_id,
        timestamp: commit.timestamp,
        files: commit.files,
        comments: commit.comments,
        // Don't expose vendor emails in public view
        vendor_email: '***@***.***'
      }))
    };
    
    res.json(publicEvent);
  } catch (error) {
    console.error('Error fetching public event view:', error);
    res.status(404).json({ error: 'Event not found' });
  }
});

// GET /api/view/:eventId/export - Export event data
router.get('/:eventId/export', async (req, res) => {
  try {
    const eventPath = path.join(EVENTS_DIR, `${req.params.eventId}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    const format = req.query.format || 'json';
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.json"`);
      res.json(event);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(event);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv"`);
      res.send(csvData);
    } else {
      res.status(400).json({ error: 'Unsupported format. Use json or csv.' });
    }
  } catch (error) {
    console.error('Error exporting event:', error);
    res.status(404).json({ error: 'Event not found' });
  }
});

// GET /api/view/:eventId/files/:fileName - Serve uploaded files
router.get('/:eventId/files/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Set appropriate headers
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// GET /api/view/:eventId/gallery - Get photo gallery
router.get('/:eventId/gallery', async (req, res) => {
  try {
    const eventPath = path.join(EVENTS_DIR, `${req.params.eventId}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    // Collect all image files from commits
    const gallery = [];
    
    for (const commit of event.commits) {
      const step = event.steps.find(s => s.id === commit.step_id);
      if (step && commit.files) {
        for (const fileName of commit.files) {
          const ext = path.extname(fileName).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            gallery.push({
              fileName,
              step_name: step.name,
              timestamp: commit.timestamp,
              comments: commit.comments,
              url: `/api/view/${req.params.eventId}/files/${fileName}`
            });
          }
        }
      }
    }
    
    // Sort by timestamp
    gallery.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({ gallery });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(404).json({ error: 'Event not found' });
  }
});

// Helper function to convert event data to CSV
function convertToCSV(event) {
  const headers = ['Step Name', 'Status', 'Vendor Email', 'Description', 'Time Limit', 'Created At', 'Completed At', 'Comments'];
  const rows = [headers.join(',')];
  
  for (const step of event.steps) {
    const row = [
      `"${step.name}"`,
      step.status,
      `"${step.vendor_email}"`,
      `"${step.description || ''}"`,
      `"${step.time_limit || ''}"`,
      step.created_at,
      step.completed_at || '',
      `"${step.completion_comments || ''}"`
    ];
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

module.exports = router;