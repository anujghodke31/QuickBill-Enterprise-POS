# Jules Discovery

## 1. P0 Errors

**npm install at root:**
```
4 moderate severity vulnerabilities
```

**npm install in client/:**
```
12 vulnerabilities (4 moderate, 7 high, 1 critical)
```

**node server/seed.js:**
```
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**npm run dev:**
```
Error: Cannot find module 'bcrypt' (it was using bcryptjs)
```

**docker build:**
```
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit1172133472", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/10/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/10/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
```

## 2. Dependency Advisories

**Root `npm audit --omit=dev`:**
- `qs` (moderate)
- `uuid` (moderate)

**Client `npm audit --omit=dev`:**
- `@protobufjs/utf8` (moderate)
- `protobufjs` (critical)
- `react-router` (high)

## 3. Dual Frontend Status
The `client/` directory exists and contains a Vite/React application. It is already partially integrated into `server/index.js` to be served statically in production.
**Recommendation:** Migrate fully to the Vite client. Remove the legacy vanilla HTML/JS/CSS frontend at the root (`index.html`, `style.css`, `app.js`).

## 4. Customer Model Status
The `Customer` model exists. The routes are present in `server/routes/customerRoutes.js` and wired up in `server/index.js` (`app.use('/api/customers', ...)`). The feature is functional but needs validation. Recommendation: Keep it.

## 5. Currency Math
The following fields are defined as `Number` and should be converted to integer minor units (paise):
- `server/models/Customer.js`:
  - `totalSpent` (Line 23)
- `server/models/Invoice.js`:
  - `price` (Line 18)
  - `subTotal` (Line 20)
  - `taxAmount` (Line 27)
  - `discountAmount` (Line 31)
  - `total` (Line 22)
  - `cashGiven` (Line 40)
  - `changeReturned` (Line 41)
- `server/models/Product.js`:
  - `price` (Line 26)
  - `costPrice` (Line 31)
  - `discount` (Line 36)
- `server/models/Return.js`:
  - `refundAmount` (Line 20)
  - `restockingFee` (Line 48)
- `server/models/Order.js`:
  - `price` (Line 18)
  - `totalAmount` (Line 22)

## 6. Input Validation
`express-validator` is missing entirely across all routes (`server/routes/*`). None of the controllers validate incoming inputs rigorously.
Missing validation for the following controllers that handle input:
- `server/controllers/employeeController.js` (Lines 23, 53)
- `server/controllers/returnController.js` (Line 93)
- `server/controllers/orderController.js` (Lines 7, 95)
- `server/controllers/authController.js` (Lines 55, 95, 151, 230, 253, 272)
- `server/controllers/invoiceController.js` (Line 54)
- `server/controllers/productController.js` (Lines 110, 146)
- `server/controllers/supplierController.js` (Lines 18, 45)
- `server/controllers/customerController.js` (Lines 18, 49)

ObjectId validation is also missing for `req.params.id` across various controllers (e.g. `server/controllers/employeeController.js` line 60, `server/controllers/orderController.js` line 76, `server/controllers/customerController.js` line 41).

## 7. Proposed PRs
1. **P0 - Fix Server Boot**: Update `server/models/User.js` to use `bcryptjs` (which is in `package.json`). Fix seeder `connect ECONNREFUSED` issue by making it idempotent and handling DB connections correctly if DB isn't running. Pin Node engines in package.json.
2. **P0 - Docker and Client**: Fix docker build error by updating the Dockerfile configuration. Make `client/` the canonical frontend and remove old vanilla files.
3. **P0/P1 - Route Error Handling & Validation**: Add `express-validator` to all public POST/PUT routes. Add MongoDB ObjectId guards on all `/:id` routes.
4. **P1 - Security & Auth**: Fix bcrypt rounds, JWT TTL, rate limiting, helmet CSP, etc.
5. **P1 - Money Math**: Convert all money-related fields to integer minor units (paise).

## 8. Ambiguities
- The Docker build fails with an overlayfs invalid argument error. This is likely an environment issue with the specific docker host setup.
- Need confirmation that we can delete `index.html`, `style.css`, and `app.js` at the root and focus completely on `client/`.
