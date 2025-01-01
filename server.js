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
const allowedOrigins = [
  'http://localhost:4000',
  'http://localhost:3000',
  'https://ucc-manager.vercel.app',
  'https://ucc-manager-git-main-zigao-wangs-projects.vercel.app',
  'https://ucc-manager-a7xbefdm5-zigao-wangs-projects.vercel.app'
];

// Add Vercel URL to allowed origins if present
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('CORS error for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// Helper function to write problems
async function writeProblems(problems) {
  // Ensure problems is an array
  const problemsArray = Array.isArray(problems) ? problems : [];
  await fs.writeFile(PROBLEMS_FILE, JSON.stringify(problemsArray, null, 2));
}

// Function to run the scan script
async function runScan() {
  try {
    console.log('Starting problem scan...');
    const scriptPath = path.join(__dirname, 'scripts', 'scanProblems.js');
    await execAsync(`node ${scriptPath}`);
    console.log('Problem scan completed successfully');
  } catch (error) {
    console.error('Error running problem scan:', error);
  }
}

// Run scan every 5 minutes
setInterval(runScan, 5 * 60 * 1000);

// Run initial scan when server starts
runScan();

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

// Add a problem
app.post('/api/problems', async (req, res) => {
  try {
    const { problems } = await readProblems();
    const newProblem = {
      problemId: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    problems.push(newProblem);
    await writeProblems(problems);
    res.json(newProblem);
  } catch (error) {
    console.error('Error adding problem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a problem
app.put('/api/problems/:id', async (req, res) => {
  try {
    const { problems } = await readProblems();
    console.log('Looking for problem with ID:', req.params.id);
    console.log('Available problems:', problems.map(p => p.problemId));
    
    const index = problems.findIndex(p => String(p.problemId) === String(req.params.id));
    
    if (index === -1) {
      console.log('Problem not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Keep existing fields and update only the provided ones
    const updatedProblem = {
      ...problems[index],
      tags: req.body.tags || problems[index].tags,
      notes: req.body.notes || problems[index].notes,
      updatedAt: new Date().toISOString()
    };
    
    problems[index] = updatedProblem;
    await writeProblems(problems);
    
    console.log('Successfully updated problem:', updatedProblem);
    res.json(updatedProblem);
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
