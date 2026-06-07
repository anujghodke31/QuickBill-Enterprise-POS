# JULES_DISCOVERY.md

## 1. P0 Command Errors

### `npm install` at repo root
**Output / Errors:**
Node.js v22 was installed by default, which is out of range for some dependencies if we strictly follow the engines. I switched to Node 18 (`nvm install 18 && nvm use 18`).
```
npm install
...
4 moderate severity vulnerabilities
```
No major installation errors after switching to Node 18, aside from 4 moderate vulnerabilities and warnings about deprecated `uuid` and `jpeg-exif`.

### `cd client && npm install`
**Output / Errors:**
```
npm warn EBADENGINE Unsupported engine {
  package: '@vitejs/plugin-react@5.1.4',
  required: { node: '^20.19.0 || >=22.12.0' },
  current: { node: 'v18.20.8', npm: '10.8.2' }
}
...
12 vulnerabilities (4 moderate, 7 high, 1 critical)
```
This indicates `client` requires at least Node 20.19.0 to be fully compatible with Vite/React plugins without warnings.

### `npm run dev`
**Output / Errors:**
Initially failed because `client/node_modules` was missing (vite: not found).
```
[1] sh: 1: vite: not found
[1] npm run dev:client exited with code 127
```
After running `npm install` inside `client/`, it starts successfully on port 3000 (backend) and 5173 (frontend), but gives errors for Node version.
```
You are using Node.js 18.20.8. Vite requires Node.js version 20.19+ or 22.12+. Please upgrade your Node.js version.
error when starting dev server:
TypeError: crypto.hash is not a function
...
```

### `node server/seed.js`
**Output / Errors:**
The seeder works, but currently clears out existing products and inserts anew:
```
await Product.deleteMany({});
const result = await Product.insertMany(productData);
```
It is currently "idempotent" in the sense that it doesn't duplicate them on consecutive runs, but it destroys user-created products because of `deleteMany({})`.

### Docker Build
**Output / Errors:**
```
docker build -t quickbill-pos .
...
ERROR: failed to build: failed to solve: node:18-alpine: failed to resolve source metadata for docker.io/library/node:18-alpine... 429 Too Many Requests
toomanyrequests: You have reached your unauthenticated pull rate limit.
```
Dockerfile has issues. It shows `npm start`, and `CMD [ "npm", "start" ]`. Dockerfile uses `FROM node:18-alpine` but doesn't build the client or expose the correct multi-stage setup and `.dockerignore` has flaws.

## 2. Dependency Advisories (`npm audit`)
**Repo root (`npm audit --omit=dev`):**
- `qs` (moderate) - DoS in qs.stringify.
- `uuid` (moderate) - Missing buffer bounds check.

**`client/` (`npm audit --omit=dev`):**
- `@protobufjs/utf8` (moderate) - Overlong UTF-8 decoding.
- `protobufjs` (critical) - Arbitrary code execution / DoS.
- `react-router` (high) - Unauth RCE, XSS, DoS.

## 3. The Canonical Frontend
The `client/` directory **exists** and uses React/Vite. The repo root contains the legacy vanilla `index.html` and `app.js` which is currently served by the backend at `/`.
**Recommendation:** The Vanilla SPA is complete and serves the actual POS logic well, but the Vite app is the planned future. For this task, I recommend we designate the **Vanilla SPA as the canonical frontend for now** (to maintain functionality) and document `client/` as the experimental "v2" frontend. We should remove the misleading `.env` vars for Firebase from the main README instructions until `client/` is ready to become the primary.

## 4. `Customer` Model and Routes
- `server/models/Customer.js` exists.
- `server/controllers/customerController.js` exists.
- `server/routes/customerRoutes.js` exists.
- In `server/index.js`, the route is wired as `app.use('/api/customers', protect, apiLimiter, customerRoutes);`.
**Recommendation:** The Customer routes are indeed wired. They just need to be documented properly in the README API Endpoints table.

## 5. Floating-point Number Usage for Currency
Money math uses floating-point `Number` in several places.
- `server/models/Invoice.js`: `price: Number`, `subTotal: Number`, `taxTotal: Number`, `discount: Number`, `total: Number`, `cashGiven: Number`, `changeReturned: Number`.
- `server/models/Product.js`: `price: Number`, `taxRate: Number`, `costPrice: Number`.
- `server/models/Return.js`: `refundAmount: Number`.
- `server/models/Order.js`: `price: { type: Number }`, `totalAmount: Number`.

## 6. Missing Input Validation on API Routes
None of the public or protected POST/PUT routes use `express-validator`.
- `server/routes/authRoutes.js`: `/register`, `/login`, `/google`, `/forgot-password`, `/reset-password`.
- `server/routes/productRoutes.js`: POST `/`, PUT `/:id`.
- `server/routes/invoiceRoutes.js`: POST `/`.
- `server/routes/customerRoutes.js`: POST `/`, PUT `/:id`.
- `server/routes/orderRoutes.js`: POST `/`, PUT `/:id/status`.
- `server/routes/returnRoutes.js`: POST `/`, PUT `/:id/status`.
- `server/routes/supplierRoutes.js`: POST `/`, PUT `/:id`.
- `server/routes/employeeRoutes.js`: POST `/`, PUT `/:id`.

## 7. Proposed Order of Fixes (Follow-up PRs)
1. **P0: Environment & Build Fixes** (Pin engines to 20.x, fix Dockerfile multi-stage, fix seeder to use `updateOne` upsert, fix client build scripts).
2. **P0: README & Route documentation** (Clarify frontend canonical status, add missing endpoints to table).
3. **P1: Security Middleware & Validation** (Helmet strict CSP, `express-validator` on auth, invoices, products, customers, limiters, CORS).
4. **P1: Currency Math & Inventory Consistency** (Convert `Number` to `Integer` paise in models and controllers, implement atomic `findOneAndUpdate` for inventory, add `idempotencyKey`).
5. **P1/P2: Auth Hardening & Secrets** (Bcrypt 12 rounds, JWT TTL, Google token backend validation, ensure `.gitignore` covers everything).
6. **P2: Frontend Modularization** (Refactor `app.js` into ES modules, remove inline JS for CSP, fix keyboard hooks).
7. **P3/P4: Backend Quality & CI** (Error middleware standardization, Winston logger, GitHub Actions CI, Husky pre-commits).

## 8. Clarifications needed from Maintainer (Anuj)
- Should we prioritize completing the Vite client migration, or maintain the vanilla SPA as the long-term solution?
- For the Vite app, should we update its requirements to Node 20 and pin the repo to Node 20.19.0+?
- Should the `Customer` feature be fully enabled in the vanilla UI, or just kept at the API level for now?
