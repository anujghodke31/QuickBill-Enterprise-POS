const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (IGNORE_DIRS.includes(file)) return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(process.cwd());

let report = '# Daily Code Analysis Report\n\n';

// 1. TODO/FIXME Analysis
let todos = [];
let fixmes = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('TODO')) {
      todos.push(`- **${path.relative(process.cwd(), file)}:${index + 1}**: ${line.trim()}`);
    }
    if (line.includes('FIXME')) {
      fixmes.push(`- **${path.relative(process.cwd(), file)}:${index + 1}**: ${line.trim()}`);
    }
  });
});

report += `## Technical Debt Indicators\n\n`;
if (todos.length > 0) {
    report += `### TODOs (${todos.length})\n${todos.join('\n')}\n\n`;
} else {
    report += `### TODOs\nNone found.\n\n`;
}

if (fixmes.length > 0) {
    report += `### FIXMEs (${fixmes.length})\n${fixmes.join('\n')}\n\n`;
} else {
    report += `### FIXMEs\nNone found.\n\n`;
}

// 2. Large Files Analysis
report += `## Large Files (> 300 lines)\n\n`;
const largeFiles = [];
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  if (lines > 300) {
    largeFiles.push(`- **${path.relative(process.cwd(), file)}**: ${lines} lines`);
  }
});
if (largeFiles.length > 0) {
    report += `${largeFiles.join('\n')}\n\n`;
} else {
    report += `None found.\n\n`;
}

// 3. Security Audit
report += `## Security Audit\n\n`;
try {
  // Try running npm audit --json
  // If vulnerabilities found, it exits with 1, but outputs JSON to stdout
  execSync('npm audit --json', { encoding: 'utf8', stdio: 'pipe' });
  // If success (exit code 0), likely no vulnerabilities or just info
  report += `No vulnerabilities found.\n`;
} catch (error) {
  // Exit code non-zero
  if (error.stdout) {
      try {
        const auditJson = JSON.parse(error.stdout);
        if (auditJson.metadata && auditJson.metadata.vulnerabilities) {
            const vulns = auditJson.metadata.vulnerabilities;
            report += `**Summary (Found Vulnerabilities):**\n`;
            report += `- Info: ${vulns.info}\n`;
            report += `- Low: ${vulns.low}\n`;
            report += `- Moderate: ${vulns.moderate}\n`;
            report += `- High: ${vulns.high}\n`;
            report += `- Critical: ${vulns.critical}\n\n`;
        } else {
            report += `Audit run completed with errors but no summary found.\n`;
        }
      } catch (e) {
         report += `Error parsing audit output: ${e.message}\n`;
      }
  } else {
      report += `Error running npm audit: ${error.message}\n`;
  }
}

console.log(report);
