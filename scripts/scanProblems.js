const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Store problems in a local array
let problems = [];
let lastScanTime = null;

// GitHub API configuration
const REPO_OWNER = 'ZigaoWang';
const REPO_NAME = 'usaco-cses-cf';
const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';
const GITHUB_REPO = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

// Scanning interval in milliseconds (5 minutes)
const SCAN_INTERVAL = 5 * 60 * 1000;

async function fetchGitHubContent(path) {
  try {
    const response = await axios.get(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching GitHub content for ${path}:`, error.message);
    return [];
  }
}

async function fetchFileContent(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching file content:', error.message);
    return '';
  }
}

async function scanGitHubDirectory(platform) {
  try {
    const contents = await fetchGitHubContent(platform);
    
    for (const item of contents) {
      if (item.type === 'dir') {
        let problemId, name;
        const isTLE = item.name.toLowerCase().startsWith('tle-');
        
        if (platform === 'cf') {
          // CodeForces format: tle-1234-b-name
          const match = item.name.match(/^(?:tle-)?(\d+)-([a-zA-Z])-(.+)/);
          if (match) {
            problemId = `${match[1]}${match[2].toUpperCase()}`;
            name = match[3].replace(/-/g, ' ');
          }
        } else if (platform === 'cses') {
          // CSES format: tle-1234-name
          const match = item.name.match(/^(?:tle-)?(\d+)-(.+)/);
          if (match) {
            problemId = match[1];
            name = match[2].replace(/-/g, ' ');
          }
        } else if (platform === 'usaco') {
          // USACO format: tle-855
          const match = item.name.match(/^(?:tle-)?(.+)/);
          if (match) {
            problemId = match[1];
            name = `Problem ${match[1]}`;
          }
        }
        
        if (problemId) {
          // GitHub URLs
          const filePath = `${platform}/${item.name}/main.cpp`;
          const sourceFile = `${GITHUB_REPO}/blob/main/${filePath}`;
          const rawSourceFile = `${GITHUB_RAW}/${REPO_OWNER}/${REPO_NAME}/main/${filePath}`;
          
          // Fetch code content
          let code = await fetchFileContent(rawSourceFile);
          
          // Check if problem already exists
          const existingProblem = problems.find(p => 
            p.platform === platform && p.problemId === problemId
          );
          
          // For new problems
          if (!existingProblem) {
            problems.push({
              platform,
              problemId,
              name: isTLE ? `tle-${name}` : name,
              code,
              sourceFile,
              rawSourceFile,
              folderName: isTLE ? item.name : `tle-${problemId}-${name.replace(/ /g, '-').toLowerCase()}`,
              tags: [],
              notes: '',
              result: isTLE ? 'Time Limit Exceeded' : 'Accepted',
              createdAt: new Date().toISOString()
            });
            
            console.log(`Added ${platform.toUpperCase()} problem ${problemId}${isTLE ? ' (TLE)' : ''}`);
          } else {
            // Update existing problem
            existingProblem.code = code;
            existingProblem.sourceFile = sourceFile;
            existingProblem.rawSourceFile = rawSourceFile;
            existingProblem.name = isTLE ? `tle-${name}` : name;
            existingProblem.folderName = isTLE ? item.name : `tle-${problemId}-${name.replace(/ /g, '-').toLowerCase()}`;
            existingProblem.result = isTLE ? 'Time Limit Exceeded' : 'Accepted';
            console.log(`Updated ${platform.toUpperCase()} problem ${problemId}${isTLE ? ' (TLE)' : ''}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${platform} directory:`, error.message);
  }
}

async function init() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    // Load existing problems if any
    const problemsFile = path.join(dataDir, 'problems.json');
    try {
      const data = await fs.readFile(problemsFile, 'utf-8');
      const parsedData = JSON.parse(data);
      problems = Array.isArray(parsedData.problems) ? parsedData.problems : [];
      lastScanTime = parsedData.lastModified || null;
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.writeFile(problemsFile, JSON.stringify({ problems: [], lastModified: null }));
        problems = [];
        lastScanTime = null;
      } else {
        console.error('Error reading problems file:', error);
      }
    }
  } catch (error) {
    console.error('Error initializing:', error);
  }
}

async function scanAll() {
  try {
    console.log('Starting problem scan...');
    
    // Keep existing metadata
    const existingProblems = [...problems];
    problems = [];
    
    // Scan all platforms
    await Promise.all([
      scanGitHubDirectory('usaco'),
      scanGitHubDirectory('cses'),
      scanGitHubDirectory('cf')
    ]);
    
    // Restore metadata from existing problems
    problems = problems.map(newProblem => {
      const existing = existingProblems.find(p => 
        p.platform === newProblem.platform && p.problemId === newProblem.problemId
      );
      return {
        ...newProblem,
        tags: existing?.tags || [],
        notes: existing?.notes || ''
      };
    });
    
    // Update last scan time
    lastScanTime = new Date().toISOString();
    
    // Save to file
    const problemsFile = path.join(__dirname, '..', 'data', 'problems.json');
    await fs.writeFile(
      problemsFile,
      JSON.stringify({
        problems,
        lastModified: lastScanTime
      }, null, 2)
    );
    
    console.log(`Scan complete. Found ${problems.length} problems.`);
    return { problems, lastModified: lastScanTime };
  } catch (error) {
    console.error('Error during scan:', error);
    return { problems: [], lastModified: null };
  }
}

async function getProblemsData() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'data', 'problems.json'), 'utf-8');
    const parsedData = JSON.parse(data);
    return {
      problems: parsedData.problems || [],
      lastModified: parsedData.lastModified || null
    };
  } catch (error) {
    console.error('Error reading problems:', error);
    return await scanAll();
  }
}

async function startPeriodicScan() {
  console.log('Starting periodic problem scanner...');
  
  // Initial scan
  await init();
  const initialData = await scanAll();
  
  // Set up periodic scanning
  setInterval(() => {
    console.log('Running periodic scan...');
    scanAll().catch(error => {
      console.error('Error in periodic scan:', error.message);
    });
  }, SCAN_INTERVAL);
  
  return initialData;
}

module.exports = {
  startPeriodicScan,
  getProblemsData
};
