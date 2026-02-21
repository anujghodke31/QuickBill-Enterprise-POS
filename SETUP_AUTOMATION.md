# Daily Automation Setup

This repository includes a GitHub Actions workflow to automate daily maintenance tasks, including:

1.  **Linting & Formatting**: Automatically fixes code style issues using ESLint and Prettier.
2.  **Testing**: Runs the backend test suite.
3.  **Code Analysis**: Generates a daily report on technical debt (TODOs/FIXMEs), large files, and security vulnerabilities.
4.  **Reporting**: Creates a Pull Request with fixes and the analysis report, or opens an Issue if no fixes are needed.

## Configuration

The workflow file is located at `.github/workflows/daily-maintenance.yml`.

### Schedule
The workflow is configured to run daily at **00:00 UTC**.
```yaml
on:
  schedule:
    - cron: '0 0 * * *'
```

### Permissions
The workflow requires the following permissions to push changes and create PRs/Issues:
```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
```
These are already configured in the workflow file. Ensure that "Read and write permissions" are enabled in your repository settings under **Settings > Actions > General > Workflow permissions**.

## Scripts

- `npm run lint`: Runs ESLint on the codebase.
- `npm run lint:fix`: Runs ESLint with auto-fix.
- `npm run format`: Runs Prettier to format code.
- `npm test`: Runs the backend tests.
- `node scripts/daily_analysis.js`: Runs the analysis script manually.

## Customization

To adjust the analysis thresholds (e.g., file size limit), edit `scripts/daily_analysis.js`.

## Troubleshooting

- **Workflow fails on `npm ci`**: Ensure `package-lock.json` is up to date with `package.json`.
- **PR not created**: Check if the "Daily Maintenance" run detected changes. If no changes were detected, it creates an Issue instead.
