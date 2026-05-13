# Discovery PR

## 1. P0 Errors found

### `npm install`
Found 6 vulnerabilities (3 moderate, 3 high) in the root package.

### `npm run dev`
Failed with `sh: 1: vite: not found` indicating the `client/` Vite app doesn't have its dependencies installed or a problem with `npm run dev:client`. Also threw `Error: Cannot find module 'bcryptjs'` in `server/index.js`.
After installing `bcryptjs` and running `npm install` in `client/`, it still fails if mongodb is not running.

### `node server/seed.js`
Failed with `❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017` because MongoDB was not running.

### Docker
The Docker build fails out of the box because there is no `.dockerignore` file, which leads to large context sizes and overlayfs issues on some Docker configurations. We will need to add a `.dockerignore` with `node_modules`, `.env`, and `.git`.

## 2. Dependency advisories

### Root `npm audit`
```
# npm audit report

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

### `client/` `npm audit`
```
# npm audit report

@protobufjs/utf8  <=1.1.0
Severity: moderate
protobufjs has overlong UTF-8 decoding - https://github.com/advisories/GHSA-q6x5-8v7m-xcrf
fix available via `npm audit fix`
node_modules/@protobufjs/utf8

protobufjs  <=7.5.5
Severity: critical
Arbitrary code execution in protobufjs - https://github.com/advisories/GHSA-xq3m-2v4x-88gg
...

2 vulnerabilities (1 moderate, 1 critical)
```

## 3. Canonical Frontend recommendation

The `client/` directory exists and seems to be a complete Vite + React app, while `index.html`, `style.css`, and `app.js` are in the root directory. Given that `npm run dev` runs `npm run dev:client` alongside the server, the Vite app is the intended future frontend.
However, the instructions state:
> Decide and document whether the canonical UI is the vanilla SPA (index.html + app.js) or the Vite client/. Do not silently delete either.
> If client/ exists, document its purpose in the README and ensure it builds with cd client && npm run build.

I recommend making `client/` the canonical frontend, as it uses modern tools (React/Vite). The root files (`index.html`, `app.js`, `style.css`) should be preserved as "legacy vanilla SPA" for reference but not served by default. The README should be updated to clarify this.

## 4. Customer model and routes

The `Customer` model exists (`server/models/Customer.js`), and routes exist (`server/routes/customerRoutes.js`). The routes are mounted at `/api/customers` in `server/index.js`. Thus, the routes are wired. I recommend keeping the feature and ensuring the routes work properly.

## 5. Floating-point numbers for currency

Found several instances of `Number` being used for currency in `server/models/`:

- `server/models/Invoice.js`:
  - line 18: `price: Number`
  - line 20: `subTotal: Number`
  - line 22: `discount: { type: Number, ... }`
  - line 27: `tax: { type: Number, ... }`
  - line 31: `totalAmount: { type: Number, ... }`
  - line 40: `cashGiven: Number`
  - line 41: `changeReturned: Number`
- `server/models/Product.js`:
  - line 26: `price: { type: Number, ... }`
  - line 31: `compareAtPrice: { type: Number, ... }`
- `server/models/Return.js`:
  - line 20: `price: { type: Number, ... }`
  - line 48: `refundAmount: { type: Number, ... }`
- `server/models/Order.js`:
  - line 18: `price: { type: Number, required: true }`
  - line 22: `totalAmount: { type: Number, required: true }`

These should be converted to integer minor units (paise) and renamed/documented as such.

## 6. API routes missing input validation

Review of API routes indicates input validation using `express-validator` is missing. For example:

- **Auth Routes (`server/controllers/authController.js`)**:
  - `registerUser` (line 46): manually checking truthiness for `name`, `username`, `password`.
  - `loginUser` (line 80): simply pulling `username`, `password` with no validation.
- **Product Routes (`server/controllers/productController.js`)**:
  - `createProduct` (line 89): blindly accepts fields.
  - `updateProduct` (line 120): blindly accepts fields.
- **Invoice Routes (`server/controllers/invoiceController.js`)**:
  - `createInvoice` (line 44): Checks if `cartItems` is an array and loops through items checking `productId` and `quantity`. However, no robust schema validation is done on these nested items or the outer fields (`cashGiven`, `paymentMethod`).
- **Customer, Supplier, Employee, Return, and Order Routes**: Similarly lack formal validation schemas using `express-validator` and pass raw inputs directly or use weak manual checks.

## 7. Proposed sequence of PRs

1. **P0 - Stabilize Build & Boot:** Fix `npm install` (add missing `bcryptjs`), pin Node engines, fix `seed.js` idempotency, update Dockerfile.
2. **P0 - Reconcile Frontend & Documentation:** Document `client/` as canonical in README, ensure it builds. Move vanilla files to `legacy/` or document them clearly.
3. **P1 - Security & Validation:** Add `express-validator`, Mongo sanitization, ObjectId guards, rate limiting, helmet/CORS hardening.
4. **P1 - Money Math Refactor:** Convert all DB schemas and controllers to use integer minor units for currency.
5. **P1 - Inventory Concurrency:** Refactor checkout to decrement stock atomically using `findOneAndUpdate`.
6. **P1 - Auth Hardening:** Increase bcrypt rounds, enforce strict password policies, validate JWTs properly.

## 8. Ambiguities for Anuj

- Are we strictly keeping the vanilla frontend for backward compatibility, or is it okay to move it to a `legacy/` folder so it doesn't clutter the root?
- For the Vite `client/`, should we serve its built files from `/` in production and redirect API calls to `/api`?
