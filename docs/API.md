# API Documentation

Base URL: `/api`

`GET /health` is public and reports API availability, database connection state, process uptime, and timestamp. Successful responses use `{ "success": true, "message": "...", "data": {} }`. Errors use `{ "success": false, "message": "...", "errors": [] }`.
