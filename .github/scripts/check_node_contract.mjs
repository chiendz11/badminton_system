import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const runtime = process.argv[2];
if (!['node', 'web'].includes(runtime)) throw new Error('Expected node or web');
const manager = process.env.PACKAGE_MANAGER;
if (!['npm', 'pnpm'].includes(manager)) throw new Error('Expected npm or pnpm');
const packageFile = 'package.json';
if (!existsSync(packageFile)) throw new Error('Missing component package.json');
const { scripts = {} } = JSON.parse(readFileSync(packageFile, 'utf8'));
const required = ['lint', 'typecheck', 'test:unit', 'test:contract', 'build'];
if (runtime === 'node') required.push('test:integration');
if (process.env.PRISMA === 'true') required.push('prisma:validate', 'prisma:generate', 'prisma:migrate:deploy');
for (const name of required) {
  const command = scripts[name];
  if (typeof command !== 'string' || !command.trim()) throw new Error(`Missing CI script ${name}; see docs/CI.md`);
  if (/no test specified|passWithNoTests|--if-present|--fix(?:[=\s]|$)|--watch(?:[=\s]|$)/.test(command)) {
    throw new Error(`${name} must run a real, non-mutating, single-pass check`);
  }
}
const root = process.env.GITHUB_WORKSPACE || process.cwd();
const installPath = process.env.INSTALL_PATH || '.';
const lock = path.resolve(root, installPath, process.env.LOCKFILE || (manager === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json'));
if (!existsSync(lock)) throw new Error(`Missing committed lockfile: ${lock}`);
const installPackage = path.resolve(root, installPath, 'package.json');
if (!existsSync(installPackage)) throw new Error('Install root must have package.json');
const installConfig = JSON.parse(readFileSync(installPackage, 'utf8'));
const declared = installConfig.packageManager;
if (declared) {
  const expected = manager === 'pnpm' ? `pnpm@${process.env.PACKAGE_MANAGER_VERSION}` : 'npm@';
  if (manager === 'pnpm' ? declared !== expected : !declared.startsWith(expected)) {
    throw new Error('packageManager and manifest version must agree');
  }
}
console.log(`Validated ${runtime} scripts and ${manager} workspace lockfile`);
