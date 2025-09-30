#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.clientDir = path.join(__dirname, 'client');
    this.serverDir = path.join(__dirname, 'server');
    this.results = {
      frontend: null,
      backend: null,
      e2e: null
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, cwd, description) {
    this.log(`Starting: ${description}`);
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        cwd,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.log(`Completed: ${description}`, 'success');
          resolve({ stdout, stderr, code });
        } else {
          this.log(`Failed: ${description} (exit code: ${code})`, 'error');
          reject({ stdout, stderr, code });
        }
      });
    });
  }

  async checkDependencies() {
    this.log('Checking dependencies...');

    // Check Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' });
      this.log(`Node.js version: ${nodeVersion.trim()}`);
    } catch (error) {
      throw new Error('Node.js is not installed');
    }

    // Check if npm dependencies are installed
    const clientPackageJson = path.join(this.clientDir, 'package.json');
    const serverPackageJson = path.join(this.serverDir, 'package.json');

    if (!fs.existsSync(clientPackageJson)) {
      throw new Error('Client package.json not found');
    }

    if (!fs.existsSync(serverPackageJson)) {
      throw new Error('Server package.json not found');
    }

    this.log('Dependencies check passed', 'success');
  }

  async installDependencies() {
    this.log('Installing dependencies...');

    try {
      await this.runCommand('npm install', this.clientDir, 'Installing client dependencies');
      await this.runCommand('npm install', this.serverDir, 'Installing server dependencies');
    } catch (error) {
      throw new Error('Failed to install dependencies');
    }
  }

  async runFrontendTests() {
    this.log('Running frontend unit tests...');
    try {
      const result = await this.runCommand(
        'npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage',
        this.clientDir,
        'Frontend unit tests'
      );
      this.results.frontend = { success: true, ...result };
      return result;
    } catch (error) {
      this.results.frontend = { success: false, ...error };
      throw error;
    }
  }

  async runBackendTests() {
    this.log('Running backend integration tests...');
    try {
      const result = await this.runCommand(
        'npm test',
        this.serverDir,
        'Backend integration tests'
      );
      this.results.backend = { success: true, ...result };
      return result;
    } catch (error) {
      this.results.backend = { success: false, ...error };
      throw error;
    }
  }

  async startServers() {
    this.log('Starting development servers...');

    // Start backend server
    const backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: this.serverDir,
      detached: true,
      stdio: 'pipe'
    });

    // Start frontend server
    const frontendProcess = spawn('npm', ['start'], {
      cwd: this.clientDir,
      detached: true,
      stdio: 'pipe'
    });

    // Wait for servers to start
    await this.waitForServer('http://localhost:3000', 'Backend server');
    await this.waitForServer('http://localhost:4200', 'Frontend server');

    return { backendProcess, frontendProcess };
  }

  async waitForServer(url, name, timeout = 60000) {
    this.log(`Waiting for ${name} to start...`);
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok || response.status < 500) {
          this.log(`${name} is ready`, 'success');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`${name} failed to start within ${timeout}ms`);
  }

  async runE2ETests() {
    this.log('Running E2E tests...');
    try {
      const result = await this.runCommand(
        'npm run e2e',
        this.clientDir,
        'E2E tests'
      );
      this.results.e2e = { success: true, ...result };
      return result;
    } catch (error) {
      this.results.e2e = { success: false, ...error };
      throw error;
    }
  }

  generateReport() {
    this.log('Generating test report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: Object.keys(this.results).length,
        passed: Object.values(this.results).filter(r => r && r.success).length,
        failed: Object.values(this.results).filter(r => r && !r.success).length
      },
      results: this.results
    };

    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`Test report generated: ${reportPath}`, 'success');

    // Print summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total test suites: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);

    Object.entries(this.results).forEach(([key, result]) => {
      if (result) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${key.toUpperCase()}: ${status}`);
      }
    });

    return report.summary.failed === 0;
  }

  async runAll() {
    try {
      await this.checkDependencies();

      // Install dependencies if needed
      if (process.argv.includes('--install')) {
        await this.installDependencies();
      }

      // Run unit tests first
      if (!process.argv.includes('--skip-unit')) {
        try {
          await this.runFrontendTests();
        } catch (error) {
          this.log('Frontend tests failed, continuing...', 'error');
        }

        try {
          await this.runBackendTests();
        } catch (error) {
          this.log('Backend tests failed, continuing...', 'error');
        }
      }

      // Run E2E tests if requested
      if (process.argv.includes('--e2e') || process.argv.includes('--all')) {
        let servers;
        try {
          servers = await this.startServers();
          await this.runE2ETests();
        } catch (error) {
          this.log('E2E tests failed', 'error');
        } finally {
          // Clean up servers
          if (servers) {
            servers.backendProcess.kill();
            servers.frontendProcess.kill();
          }
        }
      }

      const allPassed = this.generateReport();
      process.exit(allPassed ? 0 : 1);

    } catch (error) {
      this.log(`Test runner failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// CLI usage
if (require.main === module) {
  const runner = new TestRunner();

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Test Runner for Angular Chat Application

Usage: node test-runner.js [options]

Options:
  --help, -h        Show this help message
  --install         Install dependencies before running tests
  --skip-unit       Skip unit tests
  --e2e            Run E2E tests only
  --all            Run all tests including E2E

Examples:
  node test-runner.js                    # Run unit tests only
  node test-runner.js --install --all    # Install deps and run all tests
  node test-runner.js --e2e             # Run E2E tests only
  node test-runner.js --skip-unit --e2e  # Skip unit tests, run E2E only
`);
    process.exit(0);
  }

  runner.runAll();
}

module.exports = TestRunner;