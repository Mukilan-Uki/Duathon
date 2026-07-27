# Architecture

The npm-workspace monorepo separates the React client from the Express API. The API follows:

`Route → validation → authentication/authorization → controller → service → model → MongoDB`

Controllers translate HTTP requests and responses. Services will own business and financial rules. Mongoose models will define persistence. Cross-cutting middleware owns security, errors, and logging. All future financial amounts will use integer minor units and MongoDB transactions.

The planned client structure includes `api`, `assets`, `components`, `context`, `hooks`, `layouts`, `pages`, `routes`, `services`, `utils`, and `validations`. The server structure includes `config`, `controllers`, `middleware`, `models`, `routes`, `services`, `validators`, `utils`, `jobs`, and `tests`.
