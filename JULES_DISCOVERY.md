# Jules Discovery Report

## 1. Errors from P0 Commands

### `npm install`
```
npm warn deprecated jpeg-exif@1.1.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
npm notice
npm notice New minor version of npm available! 11.11.0 -> 11.18.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.18.0
npm notice To update run: npm install -g npm@11.18.0
npm notice

added 240 packages, and audited 241 packages in 8s

34 packages are looking for funding
  run `npm fund` for details

6 vulnerabilities (4 moderate, 2 critical)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

### `npm run dev`
```
> quickbill-pos@2.0.0 dev
> concurrently "npm run dev:server" "npm run dev:client"

[0]
[0] > quickbill-pos@2.0.0 dev:server
[0] > nodemon server/index.js
[0]
[1]
[1] > quickbill-pos@2.0.0 dev:client
[1] > cd client && npm run dev
[1]
[0] [nodemon] 3.1.14
[0] [nodemon] to restart at any time, enter `rs`
[0] [nodemon] watching path(s): *.*
[0] [nodemon] watching extensions: js,mjs,cjs,json
[0] [nodemon] starting `node server/index.js`
[1]
[1] > client@0.0.0 dev
[1] > vite
[1]
[1]
[1]   VITE v7.3.1  ready in 347 ms
[1]
[1]   ➜  Local:   http://localhost:5173/
[1]   ➜  Network: use --host to expose
[0] (node:4706) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
[0] (Use `node --trace-deprecation ...` to show where the warning was created)
[0] info: [object Object] {"service":"quickbill-api","timestamp":"2026-07-10T00:01:04.768Z"}
[0] Server running on port 3000
```

### `node server/seed.js`
```
(node:5017) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

### `docker build -t quickbill-pos .`
```
#6 [2/5] WORKDIR /usr/src/app
#6 ERROR: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit593551232", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
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
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit593551232", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
```

## 2. Dependency advisories (`npm audit`)

### Root (`npm audit --omit=dev`)
```
# npm audit report

qs  6.11.1 - 6.15.1
Severity: moderate
qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set - https://github.com/advisories/GHSA-q8mj-m7cp-5q26
fix available via `npm audit fix`
node_modules/body-parser/node_modules/qs
node_modules/qs
  express  4.21.0 - 4.22.1 || 5.0.0-alpha.1 - 5.0.1
  Depends on vulnerable versions of qs
  node_modules/express

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix`
node_modules/uuid
  gaxios  6.4.0 - 6.7.1
  Depends on vulnerable versions of uuid
  node_modules/gaxios

4 moderate severity vulnerabilities

To address all issues, run:
  npm audit fix
```

### Client (`cd client && npm audit --omit=dev`)
```
# npm audit report

@grpc/grpc-js  <=1.9.15
Severity: high
@grpc/grpc-js: A malformed request can cause a server crash - https://github.com/advisories/GHSA-5375-pq7m-f5r2
@grpc/grpc-js: An incoming malformed compressed message can cause a client or server crash - https://github.com/advisories/GHSA-99f4-grh7-6pcq
fix available via `npm audit fix`
node_modules/@grpc/grpc-js

@protobufjs/utf8  <=1.1.0
Severity: moderate
protobufjs has overlong UTF-8 decoding - https://github.com/advisories/GHSA-q6x5-8v7m-xcrf
fix available via `npm audit fix`
node_modules/@protobufjs/utf8

protobufjs  <=7.6.2
Severity: critical
Arbitrary code execution in protobufjs - https://github.com/advisories/GHSA-xq3m-2v4x-88gg
protobuf.js: Code injection through bytes field defaults in generated toObject code - https://github.com/advisories/GHSA-66ff-xgx4-vchm
protobuf.js: Denial of service from crafted field names in generated code - https://github.com/advisories/GHSA-2pr8-phx7-x9h3
protobuf.js: Prototype injection in generated message constructors - https://github.com/advisories/GHSA-fx83-v9x8-x52w
protobuf.js: Code generation gadget after prototype pollution - https://github.com/advisories/GHSA-75px-5xx7-5xc7
protobuf.js: Process-wide denial of service through unsafe option paths - https://github.com/advisories/GHSA-jvwf-75h9-cwgg
protobuf.js: Denial of service through unbounded protobuf recursion - https://github.com/advisories/GHSA-685m-2w69-288q
protobufjs has overlong UTF-8 decoding - https://github.com/advisories/GHSA-q6x5-8v7m-xcrf
protobufjs: Denial of Service via unbounded recursive JSON descriptor expansion - https://github.com/advisories/GHSA-jggg-4jg4-v7c6
protobufjs : Schema-derived names can shadow runtime-significant properties - https://github.com/advisories/GHSA-f38q-mgvj-vph7
protobufjs: Denial of service through unbounded Any expansion during JSON conversion - https://github.com/advisories/GHSA-wcpc-wj8m-hjx6
fix available via `npm audit fix`
node_modules/protobufjs

react-router  7.0.0 - 7.15.0
Severity: high
React Router's vendored turbo-stream v2 allows arbitrary constructor invocation via TYPE_ERROR deserialization leading to Unauth RCE - https://github.com/advisories/GHSA-49rj-9fvp-4h2h
React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation - https://github.com/advisories/GHSA-2j2x-hqr9-3h42
React Router vulnerable to XSS in unstable RSC redirect handling via javascript: redirect targets - https://github.com/advisories/GHSA-8646-j5j9-6r62
React Router has stored XSS via unescaped Location header in prerendered redirect HTML - https://github.com/advisories/GHSA-f22v-gfqf-p8f3
React Router vulnerable to DoS via unbounded path expansion in __manifest endpoint - https://github.com/advisories/GHSA-8x6r-g9mw-2r78
React Router vulnerable to Denial of Service via reflected user input in single-fetch - https://github.com/advisories/GHSA-rxv8-25v2-qmq8
React Router: Potential CSRF via PUT/PATCH/DELETE document requests - https://github.com/advisories/GHSA-84g9-w2xq-vcv6
fix available via `npm audit fix`
node_modules/react-router
  react-router-dom  7.0.0-pre.0 - 7.14.1
  Depends on vulnerable versions of react-router
  node_modules/react-router-dom

5 vulnerabilities (1 moderate, 3 high, 1 critical)

To address all issues, run:
  npm audit fix
```

## 3. The Canonical Frontend (`client/` vs Vanilla)

- `client/` exists in the repository.
- **Recommendation:** Since the README explicitly lists `HTML5, CSS3, Vanilla JavaScript` as the frontend tech stack and all the existing UI is built around `index.html`, `style.css`, and `app.js`, I recommend making the Vanilla JS SPA the canonical frontend and removing `client/`.

## 4. Customer Model Wiring

- The `Customer.js` model exists.
- The `customerController.js` exists.
- The README mentions Customer Management but does not list customer routes in the API Endpoints section.
- **Recommendation:** The routes are missing from the API table in the README. I recommend keeping the feature and just adding the routes to `server/routes/customerRoutes.js` and connecting them in `server/index.js`, plus adding them to the README.

## 5. Floating-point Currency Fields

- `server/models/Customer.js`: Line 23 (`totalSpent`)
- `server/models/Invoice.js`: Line 18 (`price`), Line 20 (`subTotal`), Line 22 (`total`), Line 27 (`taxAmount`), Line 31 (`discountAmount`), Line 40 (`cashGiven`), Line 41 (`changeReturned`)
- `server/models/Product.js`: Line 26 (`price`), Line 31 (`costPrice`), Line 36 (`discount`)
- `server/models/Order.js`: Line 18 (`price`), Line 22 (`totalAmount`)
- `server/models/Return.js`: Line 20 (`refundAmount`), Line 48 (`restockingFee`)

## 6. Unvalidated API Routes

- The following controllers accept raw `req.body` without `express-validator`:
  - `server/controllers/employeeController.js` (lines 23, 53)
  - `server/controllers/returnController.js` (line 93)
  - `server/controllers/orderController.js` (lines 7, 95)
  - `server/controllers/authController.js` (lines 55, 95, 151, 230, 253, 272)
  - `server/controllers/invoiceController.js` (line 54)
  - `server/controllers/productController.js` (lines 110, 146)
  - `server/controllers/supplierController.js` (lines 18, 45)
  - `server/controllers/customerController.js` (lines 18, 49)
- (All routes need `express-validator` middleware added before reaching the controller.)

## 7. Proposed ordered list of follow-up PRs

1. **Reconcile Frontend:** Remove `client/`, clean up `.env` references from README to match Vanilla JS canonical choice.
2. **Docker Build:** Update `Dockerfile` to multi-stage, non-root user, add `.dockerignore`, fix MongoDB connection string in seed/dev.
3. **Database Seeding & Connections:** Make `seed.js` idempotent, fix MongoDB connection string logic to gracefully handle failures.
4. **API Security:** Add `express-validator`, `express-mongo-sanitize`, rate limiters, Helmet, CORS strictness.
5. **Money Math:** Refactor mongoose models and controllers to use integer minor units (paise) for all currency fields.
6. **Inventory Consistency:** Implement atomic stock updates and idempotency keys in checkout.
7. **Auth Hardening:** Fix JWT TTL, bcrypt rounds, brute-force limiter, Google Auth token validation.
8. **Customer Management:** Wire up missing `customerRoutes.js` and add to README.

## 8. Ambiguities

- Is the client currently meant to be used alongside the vanilla frontend (e.g. for a dashboard), or is it an abandoned migration? (Assuming abandoned based on README tech stack).
