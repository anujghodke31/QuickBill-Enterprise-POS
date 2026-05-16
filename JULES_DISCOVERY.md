### 1. P0 Errors found
* `npm install` has 6 high/moderate vulnerabilities via `npm audit`.
* `cd client && npm install` has 10 vulnerabilities including 1 critical (`protobufjs`).
* `npm run dev:server` threw an error because `bcryptjs` was required in `server/models/User.js` but `bcrypt` is the installed package in `package.json`.
* `node server/seed.js` failed because `MONGO_URI` defaults to `localhost:27017` but MongoDB is not running in the container.
* `docker build -t quickbill-pos .` fails because it's not a multi-stage build and contains a mount error inside my environment.
* `docker run -p 3000:3000 quickbill-pos` fails because docker build fails.

### 2. Dependency advisories
* root: 6 vulnerabilities (3 moderate, 3 high) in `brace-expansion`, `ip-address`, `minimatch`, `path-to-regexp`, `picomatch`.
* `client/`: 10 vulnerabilities (4 moderate, 5 high, 1 critical) in `@protobufjs/utf8`, `ajv`, `brace-expansion`, `flatted`, `minimatch`, `picomatch`, `postcss`, `protobufjs`, `rollup`, `vite`.

### 3. Frontend Recommendation
* `client/` does exist in the repository, and it uses Vite/React.
* Recommendation: Make the `client/` Vite app the canonical frontend. It's more maintainable than the monolith vanilla JS approach. The current backend uses `express.static(clientDist)` pointing to `client/dist`.

### 4. Customer Routes Recommendation
* The `Customer` model exists, but there are no routes handling customers.
* Recommendation: Add routes to `server/routes/customerRoutes.js` and a controller `server/controllers/customerController.js` to implement the endpoints. The README claims this feature exists, so removing it from the README would be a regression.

### 5. Floating-point Currency Handling
* `Number` type is used throughout the models, including for currencies:
    * `server/models/Invoice.js`: line 18 `price`, line 20 `subTotal`, line 22 `taxAmount`, line 27 `discountAmount`, line 31 `totalAmount`, line 40 `cashGiven`, line 41 `changeReturned`
    * `server/models/Product.js`: line 26 `price`, line 31 `costPrice`, line 36 `taxRate`
    * `server/models/Order.js`: line 18 `price`
    * `server/models/Return.js`: line 15 `refundAmount`, line 20 `restockingFee`, line 48 `price`

### 6. Missing Input Validation
* The following API routes are reachable without proper input validation:
    * `server/routes/productRoutes.js`: POST `/api/products`, PUT `/api/products/:id`
    * `server/routes/invoiceRoutes.js`: POST `/api/invoices`
    * `server/routes/authRoutes.js`: POST `/api/auth/register`, POST `/api/auth/login`
    * `server/routes/employeeRoutes.js`: POST `/api/employees`, PUT `/api/employees/:id`
    * `server/routes/supplierRoutes.js`: POST `/api/suppliers`, PUT `/api/suppliers/:id`
    * `server/routes/returnRoutes.js`: POST `/api/returns`
    * `server/routes/orderRoutes.js`: POST `/api/orders`, PUT `/api/orders/:id`

### 7. Proposed PRs
1. **Fix `npm install` and Node v18/v20 compatibility, resolve `bcrypt` bug**: Pin `engines`, fix `bcrypt` vs `bcryptjs` in `User.js`, fix dependencies via `npm audit fix`.
2. **Setup Canonical Frontend**: Document that `client/` is the frontend in README, remove vanilla JS UI if applicable, ensure Vite builds successfully.
3. **Fix DB Connection & Seeder**: Add fallback for memory DB, or fix connection string logic, and make `seed.js` idempotent.
4. **Fix Docker Build**: Create proper multi-stage Dockerfile that supports serving frontend and backend correctly.
5. **Customer Routes**: Add `customerRoutes.js` and `customerController.js`.
6. **Input Validation**: Add `express-validator` to API routes.
7. **Money Math**: Change currency fields in `mongoose` schemas to `Number` but enforce integer (paise) usage via controller logic and documentation, or change them to integers directly.

### 8. Ambiguities
* Should we completely delete the vanilla `index.html`, `style.css`, `app.js` at the root, or keep them around for a while? The Vite app is located in `client/` and has its own `index.html`. For now I will assume we keep `client/` as canonical.
