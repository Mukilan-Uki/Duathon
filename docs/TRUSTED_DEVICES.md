# Trusted Devices

Duothan uses a server-generated random device token stored in an HTTP-only cookie. Only an HMAC-SHA-256 digest is stored in MongoDB. User-agent parsing supplies display labels only and is never accepted as identity proof.

Unknown devices are recorded as pending during a successful password login and generate a security notification. Trusted devices have a configured expiry. Refresh-token records link to the device so individual-device logout and trust removal can revoke the associated sessions.

## API

- `GET /api/security/devices`
- `GET /api/security/devices/current`
- `POST /api/security/devices/trust`
- `PATCH /api/security/devices/:deviceId`
- `DELETE /api/security/devices/:deviceId/trust`
- `POST /api/security/devices/:deviceId/logout`
- `POST /api/security/devices/logout-all`

Trusting a device, removing trust, and logout-all require password confirmation. State-changing endpoints also enforce the configured trusted frontend origin.

## Environment

- `DEVICE_TOKEN_SECRET`: independent secret used for token HMACs
- `DEVICE_COOKIE_NAME`: HTTP-only device-cookie name
- `DEVICE_TRUST_DAYS`: trust lifetime

## Prototype limitations

The current application uses password confirmation as recent authentication. Email OTP is already available elsewhere, but a full optional 2FA enrollment and challenge policy is not yet connected to trusted-device approval. IP changes are recorded as risk signals; geolocation and impossible-travel detection require an external risk provider.
