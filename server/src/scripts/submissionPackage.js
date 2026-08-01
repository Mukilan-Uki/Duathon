import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const artifactDirectory = path.join(projectRoot, 'artifacts');
const artifactPath = path.join(artifactDirectory, 'duothan-banking-platform-v1.0.0-phase-2.zip');

function git(...args) {
  return execFileSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

try {
  const changes = git('status', '--porcelain');
  if (changes) {
    throw new Error('Commit or stash all changes before creating the submission ZIP.');
  }

  mkdirSync(artifactDirectory, { recursive: true });
  git(
    'archive',
    '--format=zip',
    `--prefix=duothan-banking-platform/`,
    `--output=${artifactPath}`,
    'HEAD',
  );

  console.log(`Submission package created: ${artifactPath}`);
  console.log('The archive contains tracked source files only; ignored secrets are excluded.');
} catch (error) {
  console.error(`Submission package failed: ${error.message}`);
  process.exitCode = 1;
}
