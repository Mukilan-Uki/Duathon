# Architecture

The npm-workspace monorepo separates the React client from the Express API. The API follows:

`Route → validation → authentication/authorization → controller → service → model → MongoDB`

Controllers translate HTTP requests and responses. Services will own business and financial rules. Mongoose models will define persistence. Cross-cutting middleware owns security, errors, and logging. All future financial amounts will use integer minor units and MongoDB transactions.

The planned client structure includes `api`, `assets`, `components`, `context`, `hooks`, `layouts`, `pages`, `routes`, `services`, `utils`, and `validations`. The server structure includes `config`, `controllers`, `middleware`, `models`, `routes`, `services`, `validators`, `utils`, `jobs`, and `tests`.

## Authentication lifecycle

Passwords are hashed with bcrypt. Login returns a short-lived JWT access token while a signed JWT refresh token, hashed at rest, is set as an HttpOnly cookie. Refresh requests rotate that token within a session family; reuse revokes the family. Email verification and password reset use separately scoped, hashed, expiring, attempt-limited codes.

## Account lifecycle

Customers submit Savings or Current account applications. The backend generates a unique 12-digit number beginning with the Duothan `60` prefix and initializes both balance fields to zero minor units. Staff can approve or reject pending applications and manage active/suspended status. Only administrators can close accounts. Administrative transitions create immutable audit records.
