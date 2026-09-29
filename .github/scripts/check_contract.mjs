import { existsSync, readFileSync } from 'node:fs';

const kind = process.argv[2];
if (!['backend', 'web'].includes(kind)) throw new Error('Expected backend or web');
const manager = process.env.PACKAGE_MANAGER;
if (!['npm', 'pnpm'].includes(manager)) throw new Error('Only npm and pnpm are supported');
const lockfile = manager === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json';
if (!existsSync(lockfile)) throw new Error(`Commit ${lockfile} before enabling CI`);
const { scripts = {}, dependencies = {}, devDependencies = {} } = JSON.parse(readFileSync('package.json', 'utf8'));
const required = ['lint', 'test:unit', kind === 'backend' ? 'test:integration' : 'build'];
if (kind === 'backend' && (dependencies['@nestjs/core'] || devDependencies['@nestjs/cli'])) required.push('build');
for (const name of required) {
  const command = scripts[name];
  if (typeof command !== 'string' || !command.trim()) {
    throw new Error(`Missing script: ${name}. Follow the CI contract in docs/CI.md.`);
  }
  if (/no test specified|passWithNoTests|--if-present|--fix(?:[=\s]|$)/.test(command)) {
    throw new Error(`${name} must perform a real, non-mutating check: ${command}`);
  }
}
console.log(`Validated ${kind} CI contract using ${manager}.`);
