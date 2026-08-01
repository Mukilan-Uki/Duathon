# Enterprise operations (Phases 8 and 9)

## Notifications

Every authenticated role has an owned, paginated notification feed. Notifications support unread
counts, individual and bulk read actions, soft deletion, preferences, a polling header badge, and
an accessible dropdown. Administrators can broadcast system announcements to all users or a
single role. Deleted records remain available for operational retention but are excluded from all
user queries.

## Audit and login history

The reusable audit service records actor, action, entity, request metadata, outcome, and safe
before/after snapshots. Keys that resemble passwords, tokens, OTPs, cookies, authorization values,
or secrets are recursively redacted. Audit records are immutable and administrator queries support
action, entity, user, date, and free-text filters with pagination.

Login history records successful and failed attempts, IP address, user agent, derived browser,
operating system, device class, reason, and logout time when a session is explicitly revoked.
Expired sessions do not have an exact logout time.

## Risk monitoring

Manual transaction flags and investigation notes remain available to employees and administrators.
Automatic signals are created for repeated failed sign-ins, repeated invalid OTPs, password-reset
bursts, transfers above the configurable threshold, and repeated transfer failures. Open signals
are deduplicated by user and category.

## System settings

Administrators can manage validated transaction limits, suspicious-transfer thresholds, account
automation, loan limits and rates, login/OTP/session/password policy values, notification polling,
and maintenance mode. Financial services read server-side settings with environment fallbacks.
Every update is audited.

## Operational limitations

- Notifications use 30-second polling; WebSockets are not required for this phase.
- Country lookup is intentionally omitted because no trusted geolocation provider is configured.
- Logout time is exact only for explicit logout. Browser closure and token expiry are displayed as
  active or expired.
- Maintenance, session-timeout, password-length, OTP-expiry, and notification-poll settings are
  governed values; only settings already consumed by a service change runtime behavior until a
  controlled dynamic-configuration rollout is implemented.
