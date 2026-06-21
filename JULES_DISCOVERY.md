# Jules Discovery

## 1. P0 Errors

**npm install at root:**
```
6 vulnerabilities (4 moderate, 2 critical)
```

**npm install in client/:**
```
16 vulnerabilities (2 low, 5 moderate, 8 high, 1 critical)
```

**node server/seed.js:**
```
(node:5060) [DEP0040] DeprecationWarning: The \`punycode\` module is deprecated. Please use a userland alternative instead.
(Use \`node --trace-deprecation ...\` to show where the warning was created)
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**npm run dev:**
The server starts successfully, but the client dev server script errors with `sh: 1: vite: not found` if `npm install` hasn't been run inside the `client/` folder.
After running `npm install` in `client/`, `npm run dev` successfully boots both backend and frontend servers on ports 3000 and 5173, respectively.

**docker build:**
```
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit...", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/work,upperdir=...,lowerdir=...,index=off,redirect_dir=off", err: invalid argument
```

## 2. Dependency Advisories

**Root `npm audit --omit=dev`:**
- `qs` (moderate)
- `uuid` (moderate)

**Client `npm audit --omit=dev`:**
- `@grpc/grpc-js` (high)
- `@protobufjs/utf8` (moderate)
- `protobufjs` (critical)
- `react-router` (high)

## 3. Dual Frontend Status
The `client/` directory exists and is a Vite/React application. It builds successfully into `dist/`.
**Recommendation:** We should adopt the Vite application in `client/` as the canonical frontend, as it seems to be the intended direction (the README states the repo is mid-migration, and `server/index.js` already hosts `client/dist` in production). The root vanilla JS frontend files (`index.html`, `app.js`, `style.css`) should be safely removed to eliminate the dual-frontend split.

## 4. Customer Model Status
The `Customer` model exists in `server/models/Customer.js`. The routes exist in `server/routes/customerRoutes.js` and `server/controllers/customerController.js`, and they are already mounted in `server/index.js` (at `/api/customers`). Thus, the routes are wired.

## 5. Currency Math
The following files define `Number` fields for money and will need to be refactored to use integer minor units (paise), instead of JS floating point arithmetic.

`server/models/Customer.js`:
- `totalSpent` (Number) - Line 23

`server/models/Invoice.js`:
- `price` (Number) - Line 18
- `subTotal` (Number) - Line 20
- `taxAmount` (Number) - Line 27
- `discountAmount` (Number) - Line 31
- `total` (Number) - Line 22
- `cashGiven` (Number) - Line 40
- `changeReturned` (Number) - Line 41

`server/models/Product.js`:
- `price` (Number) - Line 26
- `costPrice` (Number) - Line 31
- `discount` (Number) - Line 36

`server/models/Return.js`:
- `refundAmount` (Number) - Line 20
- `restockingFee` (Number) - Line 48

`server/models/Order.js`:
- `price` (Number) - Line 18
- `totalAmount` (Number) - Line 22

Note: Code in `server/controllers/invoiceController.js` likely does floating-point math when saving an invoice. We need to refactor it to do calculations in minor units.

## 6. Input Validation
Currently, routes receive `req.body` but do not seem to use `express-validator` to strictly validate inputs before controller logic execution. We need to add `express-validator` checks to `server/routes/*.js`.
Files needing validation:
- `server/controllers/employeeController.js` - `req.body` is extracted at lines 23, 53.
- `server/controllers/returnController.js` - `req.body` is extracted at line 93.
- `server/controllers/orderController.js` - `req.body` is extracted at lines 7, 95.
- `server/controllers/authController.js` - `req.body` is extracted at lines 55, 95, 151, 230, 253, 272.
- `server/controllers/invoiceController.js` - `req.body` is extracted at line 54.
- `server/controllers/productController.js` - `req.body` is extracted at lines 110, 146.
- `server/controllers/supplierController.js` - `req.body` is extracted at lines 18, 45.
- `server/controllers/customerController.js` - `req.body` is extracted at lines 18, 49.

ObjectId validation is also missing for `req.params.id` across various controllers. (e.g. `server/controllers/employeeController.js` line 60, `server/controllers/orderController.js` line 76, `server/controllers/customerController.js` line 41).

## 7. Proposed PRs
1. **P0 - Fix Docker, Seed & Env Setup**: Pin Node 20 engines in `package.json`. Address Docker build mount overlay cache issue. Fix `seed.js` idempotency and connection issues.
2. **P0 - Consolidate Frontend**: Remove vanilla SPA files at root, document `client/` as canonical, update README env vars to match `client/`.
3. **P1 - API Hardening**: Implement `express-validator` for all public POST/PUT requests and add MongoDB ObjectId guards to all `/:id` routes.
4. **P1 - Security Defaults**: Enhance bcrypt rounds, adjust JWT expiration/refresh mechanisms, add `express-mongo-sanitize`, and finalize strict Helmet configurations.
5. **P1 - Integer Math**: Convert all currency fields in schemas and controllers to use integer minor units (paise) to prevent floating-point anomalies.

## 8. Ambiguities
- The user instruction mentions fixing `seed.js` idempotency and connection failures, but `connect ECONNREFUSED` usually implies MongoDB simply isn't running locally rather than a flaw in the seeder itself. I will assume the seeder requires a robust fallback mechanism or documentation to ensure a Mongo process is up.
- Does the maintainer prefer we keep both frontends and split routes? My recommendation is to drop the root SPA entirely. I await confirmation.
