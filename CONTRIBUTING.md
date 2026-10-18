# Contributing to QuickBill

## Branch names

Prefix branches with their type:

- `feature/` for new features or substantial improvements (`feature/barcode-scanner`)
- `bugfix/` for non-critical fixes (`bugfix/cart-calculation-error`)
- `hotfix/` for production-breaking fixes (`hotfix/login-crash`)
- `chore/` for maintenance, docs and dependency bumps (`chore/update-readme`)

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add loyalty point redemption at the till`
- `fix: stop negative stock on concurrent checkouts`
- `docs: document the copilot tool contract`
- `refactor: move analytics SQL into one module`

## Before opening a pull request

Run the same checks CI runs, from the repository root:

```bash
npm run format      # Prettier
npm run lint        # ESLint (typescript-eslint, react-hooks)
npm run typecheck   # tsc for api, web and shared
npm test            # Vitest: unit tests + API integration tests (needs Postgres running)
npm run build
```

Also:

1. Add or update tests for behaviour you change, especially anything that touches money, stock or auth.
2. Add a Prisma migration (`npm run db:migrate`) for every schema change; never edit an applied migration.
3. Attach screenshots for UI changes.

## Review

- Pull requests need one approving review.
- CI (lint, typecheck, tests, build, Docker image) must pass.
- Avoid force-pushing a branch that is under active review.
