# Central API Reference (v1)

Base URL: `/api/v1`

All requests expecting mutation `(POST/PUT/DELETE)` must include the standard header:
`Content-Type: application/json`

All Protected endpoints require:
`Authorization: Bearer <token>`
And rely on an embedded `httpOnly` Refresh Cookie for session rotation.

---

## Output Response Codes
- `200/201`: Success
- `400`: Zod Input Validation Error / Bad Request
- `401`: Unauthorized (Invalid or Expired Token)
- `403`: Forbidden (Lacking the requisite RBAC role: admin/cashier)
- `429`: Too Many Requests (Rate limit hit)
- `500`: Internal Engine Error

---

## 🔐 Auth Endpoints

### POST `/auth/login`
Validates credentials and generates the session.

**Request:**
```json
{
  "username": "admin",
  "password": "hashed_password"
}
```

**Response (200):**
```json
{
  "_id": "603d3f9f",
  "name": "Super Admin",
  "role": "admin",
  "token": "eyJhbGciOi...",
  "isNewUser": false
}
```

*(A secure cookie named `refreshToken` is automatically appended to the browser on 200 OK).*

### POST `/auth/refresh`
Silently rotates the 15-minute access token by verifying the cookie.

**Response (200):**
```json
{
  "token": "eyJhbGciOi..."
}
```

---

## 📦 Product Endpoints

### GET `/products` (Requires: `admin` | `cashier`)
Retrieves all inventory items. Cached for 5 minutes via Redis.

**Response (200):**
```json
[
  {
    "_id": "60d5ecb8b",
    "name": "Organic Milk",
    "sku": "MLK-001",
    "price": 45,
    "costPrice": 30,
    "stock": 140,
    "category": "Dairy"
  }
]
```

---

## 🛒 Order Endpoints

### POST `/orders` (Requires: None. Public Storefront checkout)
Processes a cart transaction, validates stock natively across MongoDB thresholds, and triggers Socket.io + NodeMailer routines.

**Request:**
```json
{
  "customer": { "name": "John Doe", "email": "john@doe.com" },
  "items": [
    { "product": "60d5ecb8b", "quantity": 2, "price": 45, "name": "Organic Milk" }
  ],
  "paymentMethod": "online",
  "totalAmount": 90
}
```

**Response (201):**
```json
{
  "_id": "ORD-779831",
  "status": "pending",
  "paymentStatus": "pending",
  "createdAt": "2024-03-24T12:00:00.000Z"
}
```
