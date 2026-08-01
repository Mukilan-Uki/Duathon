# Contributing

Use a focused feature branch and keep commits small and meaningful. Do not commit `.env` files, credentials, real customer information or generated build output.

Before opening a pull request:

```bash
npm install
npm run format:check
npm run lint
npm test
npm run build
npm audit
```

Controllers should remain thin; business and authorization rules belong in services. Validate all request input, enforce role and resource ownership on the backend, use integer minor units, reuse the secure transfer service, and require MongoDB transactions plus idempotency for financial operations. Add tests for success, validation, authorization, ownership and duplicate requests. Update API, security and user documentation when behavior changes.

Pull requests should describe scope, security impact, data-model/index changes, commands executed, manual checks, known limitations and rollback considerations.
