const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4001;

app.use(cors({
  origin: 'http://localhost:4000',
  credentials: true
}));
app.use(express.json());

const PROBLEMS_FILE = path.join(__dirname, 'data', 'problems.json');

// Helper function to read problems
async function readProblems() {
  try {
    const data = await fs.readFile(PROBLEMS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Helper function to write problems
async function writeProblems(problems) {
  await fs.writeFile(PROBLEMS_FILE, JSON.stringify(problems, null, 2));
}

// Get all problems
app.get('/api/problems', async (req, res) => {
  try {
    const problems = await readProblems();
    res.json(problems);
  } catch (error) {
    console.error('Error reading problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a problem
app.post('/api/problems', async (req, res) => {
  try {
    const problems = await readProblems();
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
    const problems = await readProblems();
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

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
