#  Invite Link Magic Auth

Privacy-centric magic-link authentication system with dynamic welcome page and secure two-page PDF generation.

Built with:

- Node.js + Express
- React + Vite
- pdf-lib
- SHA256 token hashing
- One-time token validation

---

##  Features

- Magic link authentication (no password required)
- One-time secure token
- Token expiration (15 minutes)
- Token hashing (no raw token stored)
- Dynamic HTML variable injection
- Dynamic PDF generation (2 pages)
- Secure CORS configuration
- Helmet security headers

---

## Architecture

Frontend:
- React (Vite)
- Fetch API

Backend:
- Express
- In-memory session store (demo version)
- Crypto (SHA256)
- pdf-lib

Flow:

1. User enters username + domain
2. Server generates secure token
3. Token is hashed and stored
4. User receives magic link
5. On visit, token is validated
6. Welcome page renders dynamic variables
7. Two-page PDF is generated securely

---

## Security Design

- Tokens generated using crypto.randomBytes
- Tokens hashed before storage
- 15-minute expiration
- One-time use tokens
- No password storage
- No raw data leakage

---

##  Installation

```bash
npm install
cd web
npm install
