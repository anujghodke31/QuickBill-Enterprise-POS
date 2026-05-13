# Discovery PR

## 1. P0 command errors
- `npm install` - Succeeded at root and in `client/` but reported high/critical vulnerabilities.
- `npm run dev` - Failed initially with `Error: Cannot find module 'bcryptjs'`. After installing `bcryptjs`, it started successfully.
- `docker build` - Failed due to overlay mount issue, likely because `.dockerignore` didn't exist or didn't exclude `node_modules` and a large context was copied.

## 2. Dependency advisories
**Root `npm audit`:**
- `path-to-regexp` (<0.1.13, High) - ReDoS
- `ip-address` (<=10.1.0, Moderate) - XSS

**Client `npm audit`:**
- `protobufjs` (<=7.5.5, Critical) - Arbitrary code execution & others
- `@protobufjs/utf8` (<=1.1.0, Moderate) - Overlong UTF-8 decoding

## 3. Dual Frontend Status
The `client/` directory exists and is a Vite/React application that has a full Admin layout (`Sidebar`, `Dashboard`, `POS`, `Inventory`, `Reports`, etc.) and a Storefront layout.
The `index.html`, `app.js` and `style.css` in the root also exist and are a vanilla SPA for POS.
Recommendation: Make the `client/` Vite application the canonical frontend. It is more robust and scalable. We should remove the vanilla `index.html`/`app.js`/`style.css` in a follow-up PR, and update `package.json` to build the `client/` app to `client/dist` and serve it from Express (which the backend already does `app.use(express.static(clientDist))`).

## 4. Customer Model Routes
The `Customer` model has wired routes in `server/routes/customerRoutes.js` (`GET /`, `POST /`, `PUT /:id`, `DELETE /:id`). They are mounted in `server/index.js` as `/api/customers`. So the feature is real. However, they are missing from the `README.md` API endpoints table.
Recommendation: Add the customer endpoints to the `README.md`.

## 5. Floating-point Currency Uses
- `server/controllers/invoiceController.js:12`: `const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;`
- `server/controllers/invoiceController.js`: Uses `Number(item.quantity)`, `Number(cashGiven)`, and standard JS arithmetic (`subTotal += product.price * quantity`, `subTotal - discount`, etc.).
- `server/controllers/productController.js`: Uses `Number(minPrice)`, `Number(maxPrice)` etc.
- `app.js`: Uses `Number(modalCashGiven.value)`, `Number(document.getElementById('prod-price').value)`, etc.

## 6. API Route Input Validation
Currently, routes lack robust input validation (e.g. `express-validator`).
- `POST /api/products`: Missing validation for `name`, `price`, `stock`, etc.
- `PUT /api/products/:id`: Missing validation.
- `POST /api/invoices`: Has basic checks (`Array.isArray`, `Number.isFinite`), but no express-validator middleware or strict sanitization of strings.
- `POST /api/auth/register`: Basic checks only.
- `POST /api/auth/login`: Basic checks only.
- `POST /api/customers`: Basic checks only.

## 7. Proposed PRs
- Stabilize Dependencies: Fix audit vulnerabilities and pin node engines.
- Fix `npm run dev`: Ensure `bcryptjs` is installed and server starts clean. (Already partially done in sandbox, will formalize).
- Fix Docker Build: Add proper `.dockerignore` and multi-stage `Dockerfile`.
- Seed Idempotency: Update `server/seed.js` to use `upsert` and unique keys.
- Reconcile Frontend: Declare `client/` as canonical, remove legacy `app.js`/`index.html`/`style.css`, and update README.
- API Validation: Add `express-validator` to all POST/PUT routes.
- Integer Currency: Refactor database models and controllers to use integer minor units (paise) for money.

## 8. Clarifications needed
None for now. I will proceed with opening this as a Discovery PR.
