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

// Configure CORS for both development and production
app.use(cors());  // Allow all origins for now to fix deployment issues

app.use(express.json());

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
    console.error('Error reading problems file:', error);
    // Return empty array and current time if file doesn't exist or has error
    return { 
      problems: [], 
      lastModified: new Date().toISOString() 
    };
  }
}

// Get all problems
app.get('/api/problems', async (req, res) => {
  try {
    console.log('GET /api/problems request from:', req.get('origin'));
    const { problems, lastModified } = await readProblems();
    
    // Always return an array of problems and a lastModified time
    res.json({ 
      problems: Array.isArray(problems) ? problems : [],
      lastModified: lastModified || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error reading problems:', error);
    // Return empty array and current time on error
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
