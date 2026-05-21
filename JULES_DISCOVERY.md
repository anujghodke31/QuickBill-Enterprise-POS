# Discovery PR

1. **Errors running P0 commands**
   - \`npm install\` at root completes successfully (247 packages added, 10 vulnerabilities).
   - \`cd client && npm install\` completes successfully (247 packages added, 10 vulnerabilities).
   - \`npm run dev\` fails due to \`Error: Cannot find module 'bcryptjs'\` in \`server/models/User.js\`.
   - \`node server/seed.js\` fails with \`connect ECONNREFUSED 127.0.0.1:27017\`.
   - \`docker build -t quickbill-pos .\` fails with \`mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit4185587356", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/10/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/10/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument\`
2. **Dependency advisories**
   - Root \`npm audit --omit=dev\`:
     - moderate: \`ip-address\` has XSS in Address6 HTML-emitting methods.
     - high: \`path-to-regexp\` vulnerable to Regular Expression Denial of Service.
   - \`client\` \`npm audit --omit=dev\`:
     - moderate: \`@protobufjs/utf8\` has overlong UTF-8 decoding.
     - critical: \`protobufjs\` Arbitrary code execution, Code injection, Denial of service, Prototype injection, Code generation gadget after prototype pollution, Process-wide denial of service, Denial of service through unbounded protobuf recursion, overlong UTF-8 decoding, Denial of Service via unbounded recursive JSON descriptor expansion.
3. **Dual frontend reconciliation**
   - \`client/\` exists. I recommend keeping the \`client/\` directory as the canonical frontend, as it is a modern React/Vite stack which is easier to maintain and develop features on than vanilla JS.
4. **Customer routes**
   - \`Customer\` model exists in \`server/models/Customer.js\`.
   - Routes exist in \`server/routes/customerRoutes.js\`.
   - Controller exists in \`server/controllers/customerController.js\`.
   - The routes are wired up in \`server/index.js\`.
   - Recommendation: Keep the Customer feature and ensure routes are properly validated.
5. **Floating-point number usage**
   - \`server/models/Customer.js\`: lines 19, 23 (Number)
   - \`server/models/Invoice.js\`: lines 17, 18, 20, 22, 27, 31, 40, 41 (Number)
   - \`server/models/Product.js\`: lines 26, 31, 36, 58, 59, 66 (Number)
   - \`server/models/Return.js\`: lines 15, 20, 48 (Number)
   - \`server/models/Order.js\`: lines 18, 19, 22 (Number)
   - \`server/controllers/returnController.js\`: lines 7, 15, 30, 33, 115 (Number, Math.round)
   - \`server/controllers/invoiceController.js\`: lines 12, 70, 72, 115, 116 (Number, Math.round)
   - \`server/controllers/productController.js\`: lines 34, 35, 52, 54, 60, 61 (Number)
6. **API routes lacking input validation**
   - `server/routes/authRoutes.js`: `/register`, `/login`, `/google` all lack input validation.
   - `server/routes/productRoutes.js`: `/` (POST), `/:id` (PUT) lack input validation.
   - `server/routes/invoiceRoutes.js`: `/` (POST) lacks input validation.
   - `server/routes/customerRoutes.js`: `/` (POST), `/:id` (PUT) lack input validation.
   - `server/routes/employeeRoutes.js`: `/` (POST), `/:id` (PUT) lack input validation.
   - `server/routes/supplierRoutes.js`: `/` (POST), `/:id` (PUT) lack input validation.
   - `server/routes/returnRoutes.js`: `/` (POST) lacks input validation.
   - `server/routes/orderRoutes.js`: `/` (POST), `/:id/status` (PUT) lack input validation.
7. **Proposed list of follow-up PRs**
   - PR 1: Fix \`npm run dev\` startup error by installing \`bcryptjs\`.
   - PR 2: Fix \`node server/seed.js\` database connection error.
   - PR 3: Fix Docker build error.
   - PR 4: Reconcile dual frontend: make Vite client canonical and remove vanilla files.
   - PR 5: Update README with accurate setup instructions and canonical frontend.
   - PR 6: Audit and fix input validation on all API routes using \`express-validator\`.
   - PR 7: Convert currency fields in Mongoose models to store as integer minor units (paise).
   - PR 8: Refactor controllers to handle currency as integer minor units.
   - PR 9: Fix \`npm audit\` vulnerabilities by running \`npm audit fix\`.
8. **Ambiguities**
   - Need confirmation to proceed with Vite \`client/\` as the sole canonical frontend.
