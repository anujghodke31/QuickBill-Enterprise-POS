# QuickBill Contributor Guidelines

Welcome to the QuickBill POS project! Follow these standards to ensure a smooth collaboration.

## Branch Naming Convention
Please prefix your branches strictly with the following types:
- `feature/` - For new features or substantial improvements (e.g. `feature/barcode-scanner`)
- `bugfix/` - For fixing non-critical errors (e.g. `bugfix/cart-calculation-error`)
- `hotfix/` - For critical, production-breaking fixes (e.g. `hotfix/login-crash`)
- `chore/` - For maintenance tasks, updating docs, or bumping dependencies (e.g. `chore/update-readme`)

## Commit Format (Conventional Commits)
We enforce conventional commits across all our PRs.
- `feat: Added new customer loyalty system`
- `fix: Resolved undefined crash on product null data`
- `docs: Updated API documentation for endpoints`
- `style: Formatted components using Prettier`
- `refactor: Simplified authentication middleware`

## Pull Request Checklist
1. Your code has been ran through `npm run lint` and `npm run format`.
2. Your branch strictly targets `main`.
3. You have attached screenshots if you modified the UI.
4. You have commented on functions explicitly (JSDoc) if they span over 5 lines.

## Review Process
- PRs require at least 1 approving review from a core maintainer.
- CI/CD checks (Lint, Build Verification) must securely pass.
- Do not blindly force-push branch history without prior warning if the PR is already under active review.
