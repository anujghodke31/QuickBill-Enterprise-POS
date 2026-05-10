# Discovery PR

## 1. P0 Errors found running commands

Running `npm install` inside the `client/` directory failed with:
\`\`\`
9 vulnerabilities (3 moderate, 5 high, 1 critical)
\`\`\`
(Running `npm audit fix` would be needed).

Running `npm audit --omit=dev` inside `client/`:
\`\`\`
protobufjs  <7.5.5
Severity: critical
Arbitrary code execution in protobufjs - https://github.com/advisories/GHSA-xq3m-2v4x-88gg
fix available via `npm audit fix`
node_modules/protobufjs
\`\`\`

Running `npm audit --omit=dev` at root:
\`\`\`
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
\`\`\`

## 2. Dependency advisories from `npm audit`
- `ip-address` (Moderate) at root
- `path-to-regexp` (High) at root
- `protobufjs` (Critical) in client

## 3. Client frontend situation
The `client/` directory exists. However, the root `index.html` and `app.js` are still heavily used.
*Recommendation:* Decide on one frontend. If we want to move to Vite (`client/`), we should make sure it actually has feature parity with `app.js`. For now, I recommend treating the `index.html` and `app.js` at the root as the canonical frontend, and removing `client/` unless an active migration to Vite/React is specifically desired and in progress. The README says "A full-stack **Point of Sale (POS)** application... Frontend HTML5, CSS3, Vanilla JavaScript", which implies the root files.

## 4. Customer model wiring
The `Customer` model has fully wired routes in `server/routes/customerRoutes.js` and `server/controllers/customerController.js`. It is attached to `app.use('/api/customers', ...)` in `server/index.js`.
*Recommendation:* Keep the feature. Add the missing routes to the API section in the README.

## 5. Currency with floating-point `number`
Here are places where currency is handled with `Number` or floating point (needs refactoring to integers in minor units):
- `server/controllers/returnController.js` (Lines 30, 115)
- `server/controllers/invoiceController.js` (Line 115)
- `server/controllers/productController.js` (Line 34, 35)
- `server/utils/receiptGenerator.js` (Lines 3, 40, 50)
- `server/models/Product.js`: `price`, `compareAtPrice` are `Number`.
- `server/models/Invoice.js`: `price`, `subTotal`, `discount`, `tax`, `totalAmount`, `cashGiven`, `changeReturned` are `Number`.

## 6. API routes reachable without input validation
Currently, `req.body` is destructured directly in many controllers without `express-validator` checks, such as:
- `server/controllers/employeeController.js`
- `server/controllers/returnController.js`
- `server/controllers/orderController.js`
- `server/controllers/authController.js`
- `server/controllers/invoiceController.js`
- `server/controllers/productController.js`
- `server/controllers/supplierController.js`
- `server/controllers/customerController.js`

## 7. Proposed ordered list of follow-up PRs
1. Remove `client/` (assuming Vanilla JS at root is canonical based on README stack declaration) and clean up `README.md` to remove Firebase references.
2. Fix NPM advisories and pin Node 18/20 engines in package.json.
3. Make `node server/seed.js` idempotent using upsert.
4. Ensure Docker build works end-to-end correctly.
5. Add `/api/customers` to `README.md`.
6. Fix `Number` money math across the application (converting to integers in db/controllers).
7. Add `express-validator` to API routes.
8. Auth hardening (bcrypt >= 12, stricter rate limits).
9. Add global error middleware, Pino/Winston logging, and MongoDB ObjectId guard.

## 8. Ambiguities for Anuj
- Can we completely drop the `client/` Vite app since the root is fully functional Vanilla JS, or is the intention to migrate entirely to React/Vite? If migrating, the scope of work is much larger. I am assuming Vanilla JS for now.
