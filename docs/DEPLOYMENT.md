# Deployment guide

## Production architecture

```text
Browser → Netlify React SPA → HTTPS → Render Express API → MongoDB Atlas
                                      └───────────────→ SMTP provider
```

Use separate development, staging, and production databases. Never seed demo users into production.

## 1. MongoDB Atlas

1. Create a dedicated production database user with a unique generated password.
2. Grant only the database permissions required by the application.
3. Configure Atlas network access for the Render service. Avoid `0.0.0.0/0` where a stable outbound range or private connection is available.
4. Use a connection string that specifies a database name such as `duothan`.
5. Enable backups and monitoring appropriate to the selected Atlas tier.

## 2. Render API

Create the service from the repository Blueprint using `render.yaml`, or configure:

- Build: `npm ci`
- Start: `npm start --workspace server`
- Health check: `/api/health`
- Runtime: Node.js 20+

Required variables:

| Variable                                | Production value                                      |
| --------------------------------------- | ----------------------------------------------------- |
| `NODE_ENV`                              | `production`                                          |
| `MONGODB_URI`                           | Atlas production connection string                    |
| `CLIENT_URL`                            | Exact Netlify origin, without a trailing slash        |
| `JWT_ACCESS_SECRET`                     | Unique cryptographically random value, 32+ characters |
| `JWT_REFRESH_SECRET`                    | Different random value, 32+ characters                |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP provider configuration                           |
| `SMTP_USER`, `SMTP_PASSWORD`            | Provider credentials                                  |
| `EMAIL_FROM`                            | Verified sender identity                              |

Review optional limits and loan-rate variables in `server/.env.example`. Do not configure `DEMO_SEED_PASSWORD` in production.

## 3. Netlify client

Import the repository into Netlify. `netlify.toml` builds the client and provides the SPA fallback.

Set:

```text
VITE_API_URL=https://<render-service>.onrender.com/api
```

Trigger a new client deployment after the API URL changes. `VITE_*` variables are embedded during the client build and must never contain secrets.

## 4. Cross-origin authentication

The production refresh cookie is HTTP-only, Secure, and `SameSite=None` because Netlify and Render use different origins. `CLIENT_URL` must exactly match the browser origin so CORS and trusted-origin checks accept refresh and logout requests.

## 5. Release verification

1. Confirm `GET /api/health` returns HTTP 200 and `database: connected`.
2. Register and verify a new test customer through the configured email provider.
3. Confirm login, refresh, logout, and password reset.
4. Test one account review, transfer, receipt, loan review, and repayment using test funds.
5. Confirm notifications, investigations, audit records, and settings authorization.
6. Inspect browser cookies and confirm the refresh token is not readable by JavaScript.
7. Verify CSP, `X-Frame-Options`, and `X-Content-Type-Options` response headers.
8. Check Render, Atlas, email, and Netlify logs without recording secrets or customer data.

## Rollback

Retain the last known-good Netlify deploy and Render deployment. Roll back application code before attempting database repair. Completed financial records must never be deleted. Any corrective financial operation should use a reviewed reversal workflow and create an audit record.
