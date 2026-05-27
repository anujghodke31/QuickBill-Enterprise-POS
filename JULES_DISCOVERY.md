# Jules Discovery

## 1. P0 Errors (Running Commands)

**npm install at root:**
```
added 240 packages, and audited 241 packages in 8s

34 packages are looking for funding
  run `npm fund` for details

4 moderate severity vulnerabilities

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

**npm install in client/:**
```
added 247 packages, and audited 248 packages in 18s

36 packages are looking for funding
  run `npm fund` for details

10 vulnerabilities (4 moderate, 5 high, 1 critical)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

**node server/seed.js:**
```
(node:5060) [DEP0040] DeprecationWarning: The \`punycode\` module is deprecated. Please use a userland alternative instead.
(Use \`node --trace-deprecation ...\` to show where the warning was created)
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**npm run dev:**
If dependencies are not installed, the server fails with `Error: Cannot find module 'bcryptjs'`. Once installed, `npm run dev:server` starts correctly on port 3000, though with a punycode deprecation warning.

**docker build:**
```
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit958790317", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/10/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/10/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
```
*(Note: Initial builds fail with 429 Too Many Requests if Docker Hub rate limits are hit).*

## 2. Dependency Advisories

**Root `npm audit --omit=dev`:**
- `ip-address` (moderate)
- `path-to-regexp` (high)
- `qs` (moderate)
- `uuid` (moderate)

**Client `npm audit --omit=dev`:**
- `@protobufjs/utf8` (moderate)
- `protobufjs` (critical)

## 3. Dual Frontend Status
The `client/` directory exists and is a Vite/React application.
**Recommendation:** The problem description mentions "Treat reconciling this dual-frontend situation as a P0 task." and the backend already maps `app.use(express.static(clientDist))` in production. I recommend keeping the Vite application in `client/` as the canonical frontend. We will need to remove the vanilla JS frontend (`index.html`, `app.js`, `style.css` at the root) and update the README to reflect `client/` as the single canonical frontend.

## 4. Customer Model Status
The `Customer` model exists in `server/models/Customer.js`. The routes exist in `server/routes/customerRoutes.js` and `server/controllers/customerController.js` and they are already mounted in `server/index.js` under `/api/customers`.
**Recommendation:** The routes are wired. Keep the Customer management feature claim in the README.

## 5. Currency Math
The following files define `Number` fields for money (floating point math hazard) and must be refactored to use integer minor units (paise):

- `server/models/Customer.js`
  - Line 23: `totalSpent` (Number)
- `server/models/Invoice.js`
  - Line 18: `price` (Number)
  - Line 20: `subTotal` (Number)
  - Line 27: `taxAmount` (Number)
  - Line 31: `discountAmount` (Number)
  - Line 22: `total` (Number)
  - Line 40: `cashGiven` (Number)
  - Line 41: `changeReturned` (Number)
- `server/models/Product.js`
  - Line 26: `price` (Number)
  - Line 31: `costPrice` (Number)
  - Line 36: `discount` (Number)
- `server/models/Return.js`
  - Line 20: `refundAmount` (Number)
  - Line 48: `restockingFee` (Number)
- `server/models/Order.js`
  - Line 18: `price` (Number)
  - Line 22: `totalAmount` (Number)

*(Note: `server/controllers/invoiceController.js` and other controllers doing money math will also need updates).*

## 6. Input Validation
Currently, routes receive `req.body` but do not use `express-validator` to strictly validate inputs before controller logic execution.
Files needing `express-validator` and `ObjectId` validation checks:
- `server/controllers/employeeController.js` (lines 23, 53, 60)
- `server/controllers/returnController.js` (line 93)
- `server/controllers/orderController.js` (lines 7, 76, 95)
- `server/controllers/authController.js` (lines 55, 95, 151, 230, 253, 272)
- `server/controllers/invoiceController.js` (line 54)
- `server/controllers/productController.js` (lines 110, 146)
- `server/controllers/supplierController.js` (lines 18, 45)
- `server/controllers/customerController.js` (lines 18, 41, 49)

## 7. Proposed Follow-up PRs
1. **P0 - Fix Server Boot & Environment:** Pin Node engines in package.json. Make `node server/seed.js` idempotent using `updateOne` with `upsert`. Fix unhandled deprecation warnings if possible.
2. **P0 - Reconcile Dual Frontend:** Delete `index.html`, `app.js`, and `style.css` at the root. Document `client/` as the canonical frontend in `README.md`.
3. **P0 - Docker Setup:** Add `.dockerignore` to exclude `node_modules` and `.env`. Refactor `Dockerfile` to use a multi-stage build, build `client/`, and use a non-root `node` user.
4. **P1 - Add express-validator & ObjectId Guards:** Add strictly enforced input validation and MongoDB ObjectId guards across all public POST/PUT/GET-by-ID routes.
5. **P1 - Authentication & Security Hardening:** Update bcrypt to 12 rounds, tighten JWT TTL/mechanisms, configure explicit CORS allow-list, configure strict Helmet CSP.
6. **P1 - Money Math:** Convert all money-related `Number` fields in schemas to integer minor units (paise) and refactor calculations in controllers (e.g., checkout/invoices).

## 8. Ambiguities
- **Docker Build Error:** The docker build command fails with an `overlayfs` error in the current sandbox environment (`mount source: "overlay", target: ... err: invalid argument`). This is likely an environment issue rather than a code issue. I will proceed with creating a standard multi-stage Dockerfile but may not be able to build it successfully without a clean Docker daemon.
- **Frontend Segregation:** Should we entirely remove the vanilla frontend immediately, or is there a transition period needed? I assume immediate deletion is preferred to leave `client/` as the single source of truth based on the priority instructions.