# Discovery PR Findings

1. **Errors running P0 commands:**

   - `npm install` root:
   ```
   added 240 packages, and audited 241 packages in 8s

   33 packages are looking for funding
     run `npm fund` for details

   6 vulnerabilities (3 moderate, 3 high)

   To address all issues, run:
     npm audit fix

   Run `npm audit` for details.
   npm warn deprecated jpeg-exif@1.1.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
   ```

   - `npm install` client/:
   ```
   added 247 packages, and audited 248 packages in 12s

   36 packages are looking for funding
     run `npm fund` for details

   10 vulnerabilities (4 moderate, 5 high, 1 critical)

   To address all issues, run:
     npm audit fix

   Run `npm audit` for details.
   ```

   - `npm run dev`:
   ```
   [0] node:internal/modules/cjs/loader:1386
   [0]   throw err;
   [0]   ^
   [0]
   [0] Error: Cannot find module 'bcryptjs'
   [0] Require stack:
   [0] - /app/server/models/User.js
   [0] - /app/server/middleware/authMiddleware.js
   [0] - /app/server/routes/productRoutes.js
   [0] - /app/server/index.js
   [0]     at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
   [0]     at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
   [0]     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
   [0]     at Function._load (node:internal/modules/cjs/loader:1192:37)
   [0]     at Module.require (node:internal/modules/cjs/loader:1463:12)
   [0]     at require (node:internal/modules/helpers:147:16)
   [0]     at Object.<anonymous> (/app/server/models/User.js:53:16)
   [0]     at Module._compile (node:internal/modules/cjs/loader:1705:14) {
   [0]   code: 'MODULE_NOT_FOUND',
   [0]   requireStack: [
   [0]     '/app/server/models/User.js',
   [0]     '/app/server/middleware/authMiddleware.js',
   [0]     '/app/server/routes/productRoutes.js',
   [0]     '/app/server/index.js'
   [0]   ]
   [0] }
   ```

   - `node server/seed.js`:
   ```
   (node:6087) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
   (Use `node --trace-deprecation ...` to show where the warning was created)
   ❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
   ```

2. **Dependency advisories from `npm audit`:**
   - Root:
     - `ip-address` (moderate) via `express-rate-limit`
     - `path-to-regexp` (high) via Express
   - Client:
     - `@protobufjs/utf8` (moderate)
     - `protobufjs` (critical) - Arbitrary code execution

3. **Dual frontend situation:**
   - `client/` Vite app exists with full source code.
   - Vanilla JS frontend (`index.html`, `app.js`, `style.css`) is also present in the repo root.
   - **Recommendation**: As requested in the task to "decide and document whether the canonical UI is the vanilla SPA or the Vite `client/`", the Vite client seems to be the intended modern migration path. I recommend declaring `client/` as the canonical frontend. We will need to remove the root-level frontend files (`index.html`, `app.js`, `style.css`) to prevent confusion.

4. **Customer model & routes:**
   - `Customer` model exists.
   - Routes **are wired**: `app.use('/api/customers', protect, apiLimiter, customerRoutes)` in `server/index.js:118`.
   - Controller handles basic CRUD.
   - **Recommendation**: Keep the feature claim in README.md. We will add input validation and ensure they are properly documented.

5. **Currency handling with floating-point `number`:**
   - `server/models/Invoice.js`: Line 17, 18, 20, 22, 27, 31, 40, 41
   - `server/models/Product.js`: Line 26, 31
   - `server/models/Return.js`: Line 15, 20, 48
   - `server/models/Order.js`: Line 18, 22
   - `server/controllers/invoiceController.js`: Line 96 (`subTotal += product.price * quantity;`), Line 101
   - `server/controllers/returnController.js`: Line 30, 153, 158
   - `server/controllers/productController.js`: Line 33, 34, 35, 156
   - `server/utils/receiptGenerator.js`: Line 40

6. **API routes reachable without input validation:**
   - `POST /api/products` - `server/routes/productRoutes.js:11`
   - `POST /api/invoices` - `server/routes/invoiceRoutes.js:10`
   - `POST /api/auth/register` - `server/routes/authRoutes.js:7`
   - `POST /api/auth/login` - `server/routes/authRoutes.js:8`
   - `POST /api/customers` - `server/routes/customerRoutes.js:4`

7. **Proposed ordered list of follow-up PRs:**
   - [P0] Fix NPM install, lock node version, fix server dependencies, make `seed.js` idempotent, and resolve Dockerfile issues.
   - [P0] Document & configure canonical frontend (choose `client/` or vanilla SPA), removing unused env vars/files.
   - [P1] Refactor currency math to integer minor units (paise) across DB models and controllers.
   - [P1] Add `express-validator` to all POST/PUT routes and secure Auth (bcrypt 12 rounds, short JWT).
   - [P1] Fix concurrency in `checkout` (atomic decrement via findOneAndUpdate + idempotency key).
   - [P2] Improve Frontend quality (if vanilla SPA is kept: ES modules, CSP, Audio, Chart.js fixes).
   - [P3] Improve Backend quality (Pagination, logging, standard error responses, GET /health).
   - [P4] DX & Repo hygiene (GitHub Actions, `.nvmrc`, `CONTRIBUTING.md`, Husky).

8. **Ambiguities for maintainer (Anuj):**
   - Do you want to completely remove the vanilla frontend (`index.html`, `app.js`, `style.css`) and only keep `client/` Vite app?
   - Do you have a preference on the minor unit for currency (e.g., paise for INR)?
