import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const failures = [];
const requiredFiles = [
  'render.yaml',
  'netlify.toml',
  'server/.env.example',
  'client/.env.example',
  'docs/DEPLOYMENT.md',
  'docs/DISASTER_RECOVERY.md',
];
for (const file of requiredFiles)
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);

const requiredServerVariables = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'CLIENT_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DEVICE_TOKEN_SECRET',
  'DEVICE_COOKIE_NAME',
  'SMTP_HOST',
  'EMAIL_FROM',
];
const serverExample = fs.readFileSync(path.join(root, 'server/.env.example'), 'utf8');
for (const key of requiredServerVariables)
  if (!new RegExp(`^${key}=`, 'm').test(serverExample))
    failures.push(`server/.env.example is missing ${key}`);

const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/);
for (const file of tracked) {
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example'))
    failures.push(`Tracked environment file: ${file}`);
  if (/\.(pem|key|p12|pfx)$/i.test(file)) failures.push(`Tracked key material: ${file}`);
}

if (failures.length) {
  console.error('Deployment preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.info(
  'Deployment preflight passed: configuration templates and tracked-file safety checks succeeded.',
);
console.info(
  'External deployment, provider secrets, database connectivity, email delivery and public URLs still require manual verification.',
);
