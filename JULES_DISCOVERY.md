# Discovery Phase

1. **Errors found running P0 commands**
- `npm install` at repo root completes with vulnerabilities.
- `npm run dev` at repo root fails because `bcryptjs` is missing in `server/package.json` or `package.json`, and `vite` is missing in the client (fixed after `cd client && npm install`).
- `node server/seed.js` fails with `connect ECONNREFUSED 127.0.0.1:27017` because MongoDB is not running locally.

2. **Dependency advisories from `npm audit`**
- Repo root: 6 vulnerabilities (3 moderate, 3 high) in `brace-expansion`, `ip-address`, `minimatch`, `path-to-regexp`, `picomatch`.
- `client/`: 10 vulnerabilities (4 moderate, 5 high, 1 critical) in `@protobufjs/utf8`, `ajv`, `brace-expansion`, `flatted`, `minimatch`, `picomatch`, `postcss`, `protobufjs`, `rollup`, `vite`.

3. **Dual Frontend recommendation**
- `client/` exists but hasn't been fully adopted or described in README.
- **Recommendation**: Given the prompt instruction: "If `client/` exists, document its purpose in the README and ensure it builds with `cd client && npm run build`... Decide one canonical frontend", I will decide the canonical frontend is the vanilla HTML/CSS/JS one since the README says "Vanilla JavaScript" and the monolithic `app.js` is clearly more complete for a POS system. I will keep `client/` but document it in README as an experimental Vite rewrite. (Or maybe it's better to just document it as a WIP React app). The instructions say: "document its purpose in the README and ensure it builds with `cd client && npm run build`".

4. **Customer model routes**
- `Customer` model has wired routes in `server/routes/customerRoutes.js` and is mounted in `server/index.js` as `/api/customers`.
- **Recommendation**: Add the routes to the README table since they exist and are functional.

5. **Floating-point `number` for currency**
- `server/controllers/returnController.js` (lines 7, 30, 115, etc.)
- `server/controllers/invoiceController.js` (lines 12, 70, 72, 115)
- `server/utils/receiptGenerator.js` (lines 3, 40, 50)
- `server/models/Invoice.js`, `server/models/Product.js`, `server/models/Return.js`, `server/models/Order.js` schema definitions use `Number` for prices/totals.
- Needs a `BREAKING:` PR to change DB schema to use integers (paise).

6. **Missing input validation on API routes**
- `server/routes/authRoutes.js`, `server/routes/invoiceRoutes.js`, `server/routes/productRoutes.js` etc. lack `express-validator` middleware for POST/PUT routes.

7. **Proposed follow-up PRs**
- **PR 1**: Fix `npm install` and Node engines, run `npm audit fix` where safe. Add missing backend dependencies (`bcryptjs`).
- **PR 2**: Fix `node server/seed.js` idempotency (upsert logic).
- **PR 3**: Reconcile dual frontend: update README for `client/` and fix `client/` build.
- **PR 4**: Update Dockerfile for end-to-end success (multi-stage, non-root user).
- **PR 5**: Document `/api/customers` in README and ensure `express-validator` added to customer routes.
- **PR 6**: `BREAKING:` Convert money math to integer minor units (paise) in DB schema and controllers.
- **PR 7**: Add `express-validator` to all other POST/PUT routes and `ObjectId` guards.

8. **Ambiguities**
- The prompt asks to write `JULES_DISCOVERY.md` and then wait for review before opening fix PRs.
