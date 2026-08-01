# Development Demo Credentials

These accounts are development fixtures only. They must never be seeded into a production database.

## Setup

1. Configure a dedicated local or test MongoDB database in `server/.env`.
2. Set `DEMO_SEED_PASSWORD` to a strong development-only password.
3. Run `npm run seed:demo` from the repository root.
4. Sign in with one of the email addresses below and the value of `DEMO_SEED_PASSWORD`.

| Role            | Email                          | Demo relationship                        |
| --------------- | ------------------------------ | ---------------------------------------- |
| Administrator   | `admin.demo@duothan.local`     | Platform administrator                   |
| Employee        | `employee.demo@duothan.local`  | Assigned banking employee                |
| Adult customer  | `customer.demo@duothan.local`  | Family administrator and junior guardian |
| Adult customer  | `customer2.demo@duothan.local` | Adult family member and loan applicant   |
| Junior customer | `junior.demo@duothan.local`    | Child account holder                     |

The seed also creates active adult and junior accounts, a family group, savings goal, allowance, pending junior transaction request, pending loan application, trusted and pending devices, notifications, audit data, and sample transactions.

## Resetting demo data

Use a database dedicated to development. To start from a completely clean fixture set, drop that dedicated development database with your MongoDB administration tool and rerun `npm run seed:demo`. Never drop or reseed a production database.

The seed is idempotent for normal reuse: running it again updates the named demo fixtures rather than intentionally creating duplicate users and accounts.
