const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const EVENTS_DIR = path.join(__dirname, '../../data/events');

// Ensure events directory exists
async function ensureEventsDir() {
  try {
    await fs.access(EVENTS_DIR);
  } catch {
    await fs.mkdir(EVENTS_DIR, { recursive: true });
  }
}

// POST /api/events - Create new event
router.post('/', async (req, res) => {
  try {
    await ensureEventsDir();
    
    const { name, owner_email, flow_type, steps } = req.body;
    
    // Validation
    if (!name || !owner_email || !steps || steps.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: name, owner_email, steps' });
    }
    
    const eventId = uuidv4();
    
    const event = {
      id: eventId,
      name,
      owner_email,
      flow_type: flow_type || 'sequential',
      created_at: new Date().toISOString(),
      status: 'active',
      steps: steps.map((step, index) => ({
        id: uuidv4(),
        name: step.name,
        vendor_email: step.vendor_email,
        status: 'pending',
        required_previous: flow_type === 'sequential' && index > 0 ? steps[index - 1].id : null,
        time_limit: step.time_limit || null,
        description: step.description || '',
        created_at: new Date().toISOString()
      })),
      commits: []
    };
    
    await fs.writeFile(
      path.join(EVENTS_DIR, `${eventId}.json`),
      JSON.stringify(event, null, 2)
    );
    
    res.json({ success: true, eventId, event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/events/:id - Get event details
router.get('/:id', async (req, res) => {
  try {
    const eventPath = path.join(EVENTS_DIR, `${req.params.id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    // Calculate progress
    const completedSteps = event.steps.filter(step => step.status === 'completed').length;
    const totalSteps = event.steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    
    res.json({
      ...event,
      progress: Math.round(progress),
      completed_steps: completedSteps,
      total_steps: totalSteps
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(404).json({ error: 'Event not found' });
  }
});

// GET /api/events/:id/timeline - Get event timeline
router.get('/:id/timeline', async (req, res) => {
  try {
    const eventPath = path.join(EVENTS_DIR, `${req.params.id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    // Create timeline from commits
    const timeline = event.commits.map(commit => ({
      ...commit,
      step: event.steps.find(s => s.id === commit.step_id)
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({ timeline, event: { name: event.name, status: event.status } });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(404).json({ error: 'Event not found' });
  }
});

// POST /api/events/:id/steps - Add step to event
router.post('/:id/steps', async (req, res) => {
  try {
    const eventPath = path.join(EVENTS_DIR, `${req.params.id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    const { name, vendor_email, description, time_limit } = req.body;
    
    if (!name || !vendor_email) {
      return res.status(400).json({ error: 'Missing required fields: name, vendor_email' });
    }
    
    const newStep = {
      id: uuidv4(),
      name,
      vendor_email,
      status: 'pending',
      required_previous: event.flow_type === 'sequential' && event.steps.length > 0 
        ? event.steps[event.steps.length - 1].id 
        : null,
      time_limit: time_limit || null,
      description: description || '',
      created_at: new Date().toISOString()
    };
    
    event.steps.push(newStep);
    
    await fs.writeFile(eventPath, JSON.stringify(event, null, 2));
    
    res.json({ success: true, step: newStep });
  } catch (error) {
    console.error('Error adding step:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/events/:id/status - Update event status
router.put('/:id/status', async (req, res) => {
  try {
    const eventPath = path.join(EVENTS_DIR, `${req.params.id}.json`);
    const eventData = await fs.readFile(eventPath, 'utf8');
    const event = JSON.parse(eventData);
    
    const { status } = req.body;
    
    if (!['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: active, completed, or archived' });
    }
    
    event.status = status;
    event.updated_at = new Date().toISOString();
    
    await fs.writeFile(eventPath, JSON.stringify(event, null, 2));
    
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;