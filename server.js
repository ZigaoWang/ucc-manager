const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4001;

// Configure CORS
app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

const PROBLEMS_FILE = path.join(__dirname, 'data', 'problems.json');

// Helper function to read problems
async function readProblems() {
  try {
    // Check if file exists
    await fs.access(PROBLEMS_FILE);
    
    const data = await fs.readFile(PROBLEMS_FILE, 'utf-8');
    const stats = await fs.stat(PROBLEMS_FILE);
    const lastModified = stats.mtime.toISOString();
    
    let problems;
    try {
      problems = JSON.parse(data);
    } catch (parseError) {
      console.error('Error parsing problems JSON:', parseError);
      return { problems: [], lastModified: new Date().toISOString() };
    }
    
    // Ensure problems is an array
    const problemsArray = Array.isArray(problems) ? problems : [];
    
    // Validate each problem object
    const validProblems = problemsArray.filter(problem => {
      return problem && typeof problem === 'object' && 
             typeof problem.problemId === 'string' &&
             typeof problem.name === 'string';
    });
    
    return { 
      problems: validProblems,
      lastModified 
    };
  } catch (error) {
    console.error('Error reading problems:', error);
    return { problems: [], lastModified: new Date().toISOString() };
  }
}

// API Routes
app.get('/api/problems', async (req, res) => {
  try {
    console.log('GET /api/problems request from:', req.get('origin'));
    const { problems, lastModified } = await readProblems();
    
    // Always send current time as lastModified
    res.json({ 
      problems, 
      lastModified: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error reading problems:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      problems: [],
      lastModified: new Date().toISOString()
    });
  }
});

// Update a problem
app.put('/api/problems/:problemId', async (req, res) => {
  try {
    const { problemId } = req.params;
    const updates = req.body;
    
    const { problems } = await readProblems();
    const problemIndex = problems.findIndex(p => p.problemId === problemId);
    
    if (problemIndex === -1) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Update only allowed fields
    const allowedUpdates = ['tags', 'notes'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        problems[problemIndex][field] = updates[field];
      }
    });
    
    await fs.writeFile(PROBLEMS_FILE, JSON.stringify(problems, null, 2));
    
    res.json(problems[problemIndex]);
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  } else {
    res.status(404).send('Not found');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    problems: [],
    lastModified: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
