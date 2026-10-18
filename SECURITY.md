# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 3.x     | Yes       |
| 2.x     | No        |
| 1.x     | No        |

## Reporting a vulnerability

Please do not open a public GitHub issue for security problems. Email a description and reproduction
steps to `security@yourdomain.com` (replace with the maintainer's address before publishing). You will
get an acknowledgement within 24 hours; critical fixes are prioritised for release within 48 hours.

## How QuickBill protects data

- **Passwords** are hashed with Argon2id. Login answers "invalid email or password" in constant time
  whether or not the account exists.
- **Sessions** use 15-minute JWT access tokens held in memory and 7-day refresh tokens in an
  `httpOnly`, `SameSite=Strict` cookie. Refresh tokens are stored only as HMAC digests, rotate on every
  use, and replaying an old one revokes every session from that login.
- **Authorisation** is role-based (admin, manager, cashier, customer) and enforced on every route.
  Public storefront responses never include cost prices, suppliers or exact stock.
- **Input** is validated with shared Zod schemas; all SQL is parameterised, and search input is matched
  literally.
- **Stock and money** changes run in database transactions with an atomic conditional update, so
  concurrent checkouts cannot oversell.
- **AI**: the copilot can only call read-only, parameterised analytics functions; there is no free-form
  SQL tool. Claude calls are rate-limited per user, and uploaded bills are size- and type-checked.
- **HTTP**: Helmet sets a strict Content Security Policy; CORS is limited to the configured origin;
  authentication and ordering endpoints are rate-limited.

## Please don't

- Commit `.env` files or API keys (`.gitignore` excludes them; use `.env.example` as the template).
- Remove Helmet, rate limiting or the role checks from production routes.
- Run brute-force or penetration-testing tools against a deployment without written permission.
