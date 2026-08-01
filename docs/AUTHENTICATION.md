# Authentication

Duothan uses short-lived JWT access tokens and rotating refresh tokens. Access tokens are held
in browser memory. Refresh tokens are sent only in an HTTP-only cookie and are stored in MongoDB
as SHA-256 hashes.

## Account activation policy

New registrations are `pending` and cannot sign in until email verification succeeds. Verification
sets `isEmailVerified` to `true` and activates the account. This policy prevents an unverified
address from establishing an authenticated banking session. Suspended users cannot sign in or
refresh a session.

## Token lifecycle

- A successful login returns an access token and sets the `duothan_refresh` cookie.
- `POST /api/auth/refresh` rotates the cookie and revokes the previous database record.
- Reuse of a revoked refresh token revokes every active token in the same token family.
- Logout revokes the presented refresh token and clears its cookie.
- Password reset and password change revoke all active refresh tokens for the user.

## Development email

Configure SMTP through environment variables for real delivery. When SMTP is absent in development,
the mail abstraction writes a clearly marked development-only verification code or reset link to the
server console. Development mail output must never be enabled in production.

## Authentication endpoints

| Method | Path                            | Authentication                    |
| ------ | ------------------------------- | --------------------------------- |
| POST   | `/api/auth/register`            | Public                            |
| POST   | `/api/auth/login`               | Public                            |
| POST   | `/api/auth/refresh`             | Refresh cookie and trusted origin |
| POST   | `/api/auth/logout`              | Refresh cookie and trusted origin |
| GET    | `/api/auth/me`                  | Bearer access token               |
| POST   | `/api/auth/verify-email`        | Public, rate limited              |
| POST   | `/api/auth/resend-verification` | Public, rate limited              |
| POST   | `/api/auth/forgot-password`     | Public, rate limited              |
| POST   | `/api/auth/reset-password`      | Public, rate limited              |

The reset link uses a cryptographically random, single-use token. Only its hash is persisted.
