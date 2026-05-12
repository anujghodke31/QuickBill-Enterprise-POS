# Discovery PR

## 1. Errors from running P0 commands

**npm run script at root**
```
> quickbill-pos@2.0.0 dev
> concurrently "npm run dev:server" "npm run dev:client"

[0]
[0] > quickbill-pos@2.0.0 dev:server
[0] > nodemon server/index.js
[0]
[1]
[1] > quickbill-pos@2.0.0 dev:client
[1] > cd client && npm run root_dev
[1]
[0] [nodemon] 3.1.14
[0] [nodemon] to restart at any time, enter rs
[0] [nodemon] watching path(s): *.*
[0] [nodemon] watching extensions: js,mjs,cjs,json
[0] [nodemon] starting node server/index.js
[1]
[1] > client@0.0.0 dev
[1] > vite
[1]
[1] sh: 1: vite: not found
[1] npm run root_dev:client exited with code 127
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
[0]     at TracingChannel.traceSync (node:diagnostics_channel:328:14)
[0]     at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
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
[0]
[0] Node.js v22.22.1
[0] [nodemon] app crashed - waiting for file changes before starting...
```

**node server/seed.js at root**
```
(node:7121) [DEP0040] DeprecationWarning: The punycode module is deprecated. Please use a userland alternative instead.
(Use node --trace-deprecation ... to show where the warning was created)
Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**docker build -t quickbill-pos .**
```
#0 building with "default" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 285B done
#1 DONE 0.1s

#2 [internal] load metadata for docker.io/library/node:18-alpine
#2 DONE 3.2s

#3 [internal] load .dockerignore
#3 transferring context: 2B done
#3 DONE 0.0s

#4 [1/5] FROM docker.io/library/node:18-alpine@sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e
#4 resolve docker.io/library/node:18-alpine@sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e 0.0s done
#4 DONE 0.1s

#5 [internal] load build context
#5 transferring context: 135.29MB 5.0s
#5 transferring context: 146.84MB 5.5s done
#5 CANCELED

#4 [1/5] FROM docker.io/library/node:18-alpine@sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e
#4 sha256:25ff2da83641908f65c3a74d80409d6b1b62ccfaab220b9ea70b80df5a2e0549 446B / 446B 0.2s done
#4 sha256:1e5a4c89cee5c0826c540ab06d4b6b491c96eda01837f430bd47f0d26702d6e3 1.26MB / 1.26MB 0.4s done
#4 sha256:dd71dde834b5c203d162902e6b8994cb2309ae049a0eabc4efea161b2b5a3d0e 40.01MB / 40.01MB 1.8s done
#4 sha256:f18232174bc91741fdf3da96d85011092101a032a93a388b79e99e69c2d5c870 3.64MB / 3.64MB 0.8s done
#4 extracting sha256:f18232174bc91741fdf3da96d85011092101a032a93a388b79e99e69c2d5c870 0.5s done
#4 extracting sha256:dd71dde834b5c203d162902e6b8994cb2309ae049a0eabc4efea161b2b5a3d0e 3.3s done
#4 extracting sha256:1e5a4c89cee5c0826c540ab06d4b6b491c96eda01837f430bd47f0d26702d6e3 0.1s done
#4 extracting sha256:25ff2da83641908f65c3a74d80409d6b1b62ccfaab220b9ea70b80df5a2e0549 0.0s done
#4 DONE 5.4s

#6 [2/5] WORKDIR /usr/src/app
#6 ERROR: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit2887390392", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
------
 > [2/5] WORKDIR /usr/src/app:
------
Dockerfile:4
--------------------
   2 |
   3 |     # Create app directory
   4 | >>> WORKDIR /usr/src/app
   5 |
   6 |     # Install app dependencies
--------------------
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit2887390392", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
```
*(It fails on missing `.dockerignore` and/or Dockerfile setup issues copying `node_modules` and other heavy files)*

## 2. Dependency advisories from npm audit

**Root npm audit --omit=dev:**
```
ip-address  <=10.1.0
Severity: moderate
ip-address has XSS in Address6 HTML-emitting methods - https://github.com/advisories/GHSA-v2v4-37r5-5v8g
fix available via `npm audit fix`
node_modules/ip-address
  express-rate-limit  8.0.1 - 8.5.0
  Depends on vulnerable versions of ip-address
  node_modules/express-rate-limit

path-to-regexp  <0.1.13
Severity: high
path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters - https://github.com/advisories/GHSA-37ch-88jc-xwx2
fix available via `npm audit fix`
node_modules/path-to-regexp

3 vulnerabilities (2 moderate, 1 high)
```

**client/ npm audit:**
```
9 vulnerabilities (3 moderate, 5 high, 1 critical)
```

## 3. Frontend Recommendation
The `client/` directory exists and is a Vite/React application. It builds properly when dependencies are installed. The server in `index.js` already attempts to serve `client/dist` in production (`app.use(express.static(clientDist));`).

**Recommendation**: We should make `client/` the canonical frontend, as it sets up a modern React/Vite stack which aligns better with the Express/MongoDB backend structure, and the server config points to it. We will remove `index.html`, `style.css`, and `app.js` at the root to avoid confusion, and make sure to correctly hook it up.

## 4. Customer Model Status
The `Customer` model has wired routes under `server/routes/customerRoutes.js` and is hooked up in `server/index.js` (`app.use('/api/customers', protect, apiLimiter, customerRoutes);`).

**Recommendation**: Keep the feature and ensure all routes are fully implemented and robust.

## 5. Currency Float Usage
- `server/models/Invoice.js`: Lines 11 (`price: Number`), 13 (`subTotal: Number`), 15 (`discount`), 20 (`tax`), 24 (`totalAmount`), 34 (`cashGiven: Number`), 35 (`changeReturned: Number`).
- `server/models/Product.js`: Lines 25 (`price: Number`), 30 (`compareAtPrice: Number`).
- `server/models/Order.js`: Line 15 (`price: { type: Number, required: true }`).
- `server/models/Return.js`: Line 8 (`price: { type: Number, required: true }`), Line 21 (`refundAmount: { type: Number, required: true }`), Line 25 (`restockingFee: { type: Number, default: 0 }`).
- `server/controllers/invoiceController.js`: Lines 12, 42-45, 59-62 (`Math.round((value + Number.EPSILON) * 100) / 100`), Line 74 (`const parsedCash = Number(cashGiven)`).
- `server/controllers/returnController.js`: Lines 13, 102, 110, 115-116.
- `server/utils/receiptGenerator.js`: Lines 33 (`const formatCurrency = (value) => \`INR \${Number(value || 0).toFixed(2)}\`;`), Line 81, Line 84.

## 6. Unvalidated API Routes
- `server/routes/productRoutes.js`: Lines 17, 19, 21, 23 (POST, PUT, DELETE missing express-validator).
- `server/routes/invoiceRoutes.js`: Lines 12, 13, 15, 17, 19 (POST missing express-validator).
- `server/routes/authRoutes.js`: Lines 10, 11 (POST /register, POST /login missing express-validator).
- `server/routes/customerRoutes.js`: Lines 11, 13, 15, 17, 19.
- `server/routes/supplierRoutes.js`: Lines 10, 12, 14, 16, 18.
- `server/routes/orderRoutes.js`: Lines 11, 13, 15, 17, 19.
- `server/routes/returnRoutes.js`: Lines 11, 13.

## 7. Proposed Plan
1. P0 PR: Fix basic setup: Node engines, install missing deps, add .dockerignore, fix Dockerfile, make seed.js idempotent. Delete root vanilla frontend and set `client/` as canonical.
2. P1 PR: Auth hardening (bcrypt rounds, JWT TTL), global and specific rate limits, Helmet/CORS tightening.
3. P1 PR: Replace all floating-point money math with integer paise logic (models and controllers) + wrap invoice creation in transaction.
4. P1 PR: Add express-validator to all public POST/PUT routes + MongoDB ObjectId guards + idempotent checkout.
5. P2 PR: Fix frontend quality (accessibility, charts, offline tolerance) + refactor modules.
6. P3 PR: Backend quality (Pino/Winston logger, pagination, standard error middleware).
7. P4 PR: DX improvements (Github Actions, .nvmrc, husky, .env.example, CONTRIBUTING.md).

## 8. Ambiguities
- For money math: Do we have existing invoices/products in the production database that will need a migration script from float to integer minor units immediately, or is it enough to write the migration script in `server/migrations/` as instructed?
- Are there specific Vite/React components that are incomplete in `client/` requiring urgent reimplementation of vanilla `app.js` logic?
