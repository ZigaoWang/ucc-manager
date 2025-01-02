# UCC Manager

> [!TIP]
> For IDs in the questions on different platforms, please use [this navigator](https://github.com/ZigaoWang/usaco-cses-cf-navigator) made by me.

A web application for managing competitive programming solutions. Track your solutions from USACO, CSES, and Codeforces, add tags, and write notes.

## Features

- View all your competitive programming solutions in one place
- Filter by platform (USACO, CSES, Codeforces) and result status
- Search problems by name, ID, or tags
- Add tags and notes to problems
- View source code directly in the app
- Links to GitHub source files

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- A GitHub repository containing your solutions with this structure:
  ```
  /usaco/[problem-id]/main.cpp
  /cses/[problem-id]-[name]/main.cpp
  /cf/[problem-id]-[name]/main.cpp
  ```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ucc-manager.git
   cd ucc-manager
   ```

2. Install dependencies:
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   ```

3. Configure your repository:
   - Open `scripts/scanProblems.js`
   - Update these variables:
     ```javascript
     const REPO_OWNER = 'YourGitHubUsername';
     const REPO_NAME = 'your-solutions-repo';
     ```

4. Start the application:
   ```bash
   # Start the server (from root directory)
   npm start
   
   # In another terminal, start the client
   cd client
   npm start
   ```

5. Access the application at `http://localhost:3000`

## Deployment

1. Build the client:
   ```bash
   cd client
   npm run build
   ```

2. Configure your server:
   - Update `server.js` with your desired port
   - Set up environment variables if needed

3. Deploy to your server:
   - Copy the entire project to your server
   - Install dependencies
   - Run `npm start` to start the server
   - Set up a reverse proxy (e.g., nginx) to serve the static files from `client/build`

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Author

Made by Zigao Wang
