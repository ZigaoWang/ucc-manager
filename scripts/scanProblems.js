const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Store problems in a local array
let problems = [];

// GitHub API configuration
const REPO_OWNER = 'ZigaoWang';
const REPO_NAME = 'usaco-cses-cf';
const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';
const GITHUB_REPO = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

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
        const cleanName = item.name.replace(/^tle-/i, '');
        
        if (platform === 'cf') {
          // CodeForces format: 1234-b-name
          const match = cleanName.match(/(\d+)-([a-zA-Z])-(.+)/);
          if (match) {
            problemId = `${match[1]}${match[2].toUpperCase()}`;
            name = match[3].replace(/-/g, ' ');
          }
        } else if (platform === 'cses') {
          // CSES format: 1234-name
          const match = cleanName.match(/(\d+)-(.+)/);
          if (match) {
            problemId = match[1];
            name = match[2].replace(/-/g, ' ');
          }
        } else if (platform === 'usaco') {
          // USACO format: 855
          problemId = cleanName;
          name = `Problem ${cleanName}`;
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
          
          if (!existingProblem) {
            problems.push({
              platform,
              problemId,
              name: isTLE ? `tle-${name}` : name,
              code,
              sourceFile,
              rawSourceFile,
              folderName: item.name,
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
            existingProblem.folderName = item.name;
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
    
    // Create empty problems.json if it doesn't exist
    const problemsFile = path.join(dataDir, 'problems.json');
    try {
      const data = await fs.readFile(problemsFile, 'utf-8');
      problems = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.writeFile(problemsFile, '[]');
        problems = [];
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error initializing:', error);
    process.exit(1);
  }
}

async function scanAll() {
  try {
    // Scan each platform directory
    await Promise.all([
      scanGitHubDirectory('usaco'),
      scanGitHubDirectory('cses'),
      scanGitHubDirectory('cf')
    ]);
    
    // Save updated problems to file
    const problemsFile = path.join(__dirname, '..', 'data', 'problems.json');
    await fs.writeFile(problemsFile, JSON.stringify(problems, null, 2));
    console.log('All problems have been scanned and saved.');
  } catch (error) {
    console.error('Error during scan:', error);
    process.exit(1);
  }
}

// Run the scanner
init()
  .then(scanAll)
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
