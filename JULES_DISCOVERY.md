# Discovery PR

## 1. Errors from P0 commands
**npm install (root)**
Completed without errors, but gave warnings:
```
npm warn deprecated jpeg-exif@1.1.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
```

**npm run dev**
Failed on initial run due to missing dependency `bcryptjs`:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^
Error: Cannot find module 'bcryptjs'
Require stack:
- /app/server/models/User.js
...
```

**node server/seed.js**
Failed to connect to MongoDB:
```
(node:7792) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**docker build -t quickbill-pos .**
Failed during Docker build:
```
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit126496898", fstype: overlay, flags: 0, data: "workdir=...,index=off,redirect_dir=off", err: invalid argument
```

## 2. Dependency advisories (`npm audit`)
**Root (`npm audit --omit=dev`)**
- `ip-address` (moderate) - XSS in Address6 HTML-emitting methods
- `path-to-regexp` (high) - ReDoS via multiple route parameters

**Client (`client/` -> `npm audit --omit=dev`)**
- `@protobufjs/utf8` (moderate) - Overlong UTF-8 decoding
- `protobufjs` (critical) - Arbitrary code execution, DoS, prototype pollution

## 3. Frontend Reconcilation
The `client/` directory **does exist** and contains a Vite + React application, while the root directory contains a vanilla JS SPA (`index.html`, `app.js`, `style.css`).
**Recommendation:** We should migrate completely to the React/Vite application as the canonical frontend, as it aligns better with the long-term maintainability of an Enterprise POS System and standard modern stacks. We should move the vanilla files to a `legacy/` folder (or delete them if unneeded) and ensure the Express backend serves `client/dist` reliably.

## 4. `Customer` Model & Routes
The `Customer` model **does** have wired routes.
They are located in `server/routes/customerRoutes.js` and wired in `server/index.js` via `app.use('/api/customers', protect, apiLimiter, customerRoutes);`.
**Recommendation:** Keep the feature claim in the README as it is correctly implemented and wired.

## 5. Floating-point Currency Usage
Currency is being stored as floating-point `Number` in several places:
- `server/models/Product.js`: Lines 25-30 (`price`), 31-35 (`compareAtPrice`)
- `server/models/Invoice.js`: Lines 18 (`price`), 20 (`subTotal`), 22 (`discount`), 27 (`totalAmount`), 40 (`cashGiven`), 41 (`changeReturned`)
- `server/models/Return.js`: Lines 19 (`price`), 48 (`refundAmount`)
- `server/models/Order.js`: Line 18 (`price`)
- `server/controllers/invoiceController.js`: Uses `Number` and floating-point math (`roundCurrency`), Lines 13, 96, 105, 106, 115, 116.
- `server/controllers/returnController.js`: Floating point math on Lines 30, 153, 158.

## 6. API Routes without Input Validation
No `express-validator` or equivalent input validation is used on any route. Every POST/PUT route is reachable without strict validation:
- `server/routes/authRoutes.js`: `/register`, `/login`, `/google`, `/verify-email`, `/forgot-password`, `/reset-password`
- `server/routes/invoiceRoutes.js`: `/` (POST)
- `server/routes/productRoutes.js`: `/` (POST), `/:id` (PUT)
- `server/routes/customerRoutes.js`: `/` (POST), `/:id` (PUT)
- `server/routes/employeeRoutes.js`: `/` (POST), `/:id` (PUT)
- `server/routes/supplierRoutes.js`: `/` (POST), `/:id` (PUT)
- `server/routes/returnRoutes.js`: `/` (POST)
- `server/routes/orderRoutes.js`: `/` (POST), `/:id` (PUT)

## 7. Proposed Follow-up PRs
- **PR 1 (P0):** Fix missing `bcryptjs` dependency, pin node engines (`.nvmrc`), and make `seed.js` idempotent & stable.
- **PR 2 (P0):** Resolve dual-frontend by setting React as canonical frontend, and fix Docker build pipeline.
- **PR 3 (P1):** Fix money math by migrating all currency fields and operations to integer minor units (paise).
- **PR 4 (P1):** Introduce `express-validator` and add strict input validation to all POST/PUT routes.
- **PR 5 (P1):** Harden authentication (bcrypt 12 rounds, strict passwords, Google token backend validation, JWT TTL).
- **PR 6 (P1):** Fix POS-critical inventory consistency with atomic `findOneAndUpdate`, transactions, and idempotent checkouts. Add ObjectId guards.
- **PR 7 (P1 & P3):** Resolve `npm audit` advisories, clean up secrets/`.env` from repo, configure Helmet, and structured logging.

## 8. Ambiguities for Anuj
1. Should we completely delete the vanilla files (`index.html`, `style.css`, `app.js`) or keep them in a `legacy/` directory for reference?
2. Do we expect `seed.js` to run against a real MongoDB cluster automatically during `npm run dev`, or should it strictly be manual when the user provides a `MONGO_URI`?
3. Should the React application replace the root URL `/`, or should it be served under an `/app` prefix with the legacy landing page remaining at `/`?
