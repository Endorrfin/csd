// === ADDED: production module-load smoke check ===
//
// Why this exists:
//   `nest build` emits CommonJS and the Lambda bundle loads it with require().
//   Parts of the npm ecosystem are now ESM-only ("type": "module", no `require`
//   export condition) — e.g. sanitize-html >= 2.17.6 pulls htmlparser2 v12.
//
// CHANGED: the earlier assumption "Node >= 22.12 handles that via require(esm),
//   Lambda runs nodejs22.x — fine" is WRONG and took production down with a
//   cold-start ERR_REQUIRE_ESM (502 on every route, see PR #78 fallout).
//   AWS builds the managed nodejs22.x runtime WITHOUT the experimental
//   require(esm) support, and it cannot be re-enabled via NODE_OPTIONS:
//   https://repost.aws/questions/QUybbyCc3EROmwOuU8qx6eog
//   Plain Node 22.12+ (local, GitHub Actions) DOES support it — which is exactly
//   why this check was green while prod was down. Hence `npm run check:cjs`
//   invokes node with `--no-experimental-require-module` to match Lambda.
//
//   Jest cannot catch this either: transformIgnorePatterns + ts-jest downlevel
//   those files to CJS, so the test suite proves nothing about how Lambda
//   actually loads them. This script exercises the real, untransformed path.
//
// Deliberately plain CommonJS — no ts-node, no transform, no jest.

'use strict';

// CHANGED: 22.12 was the require(esm) threshold, which no longer applies here.
// Lambda's runtime is nodejs22.x, so just keep local/CI on the same major.
const MIN_NODE = [22, 0, 0];

function parseVersion(v) {
  return v.replace(/^v/, '').split('.').map(Number);
}

function isBelow(actual, min) {
  for (let i = 0; i < min.length; i++) {
    if ((actual[i] ?? 0) < min[i]) return true;
    if ((actual[i] ?? 0) > min[i]) return false;
  }
  return false;
}

const actual = parseVersion(process.version);
if (isBelow(actual, MIN_NODE)) {
  console.error(
    `✖ Node ${process.version} is too old — Lambda runs nodejs22.x, so this check\n` +
      `  must run on Node >= ${MIN_NODE.join('.')} to be meaningful.`,
  );
  process.exit(1);
}

// === ADDED: refuse to run without the flag that emulates Lambda's loader. ===
// Without it, plain Node 22.12+ silently resolves ESM-only deps through
// require(esm) and this whole script becomes a false green.
if (process.execArgv.includes('--experimental-require-module')) {
  console.error(
    '✖ Run this via `npm run check:cjs` (node --no-experimental-require-module).\n' +
      '  With require(esm) enabled the check cannot reproduce the Lambda runtime.',
  );
  process.exit(1);
}

const deps = Object.keys(require('./../package.json').dependencies ?? {});
const failures = [];

for (const dep of deps) {
  try {
    require(dep);
  } catch (err) {
    failures.push({ dep, code: err.code ?? 'ERROR', message: err.message.split('\n')[0] });
  }
}

if (failures.length > 0) {
  console.error(`✖ ${failures.length} runtime dependency/dependencies cannot be require()d:\n`);
  for (const f of failures) {
    console.error(`  ${f.dep}  [${f.code}]  ${f.message}`);
  }
  console.error(
    '\n  ERR_REQUIRE_ESM / ERR_REQUIRE_ASYNC_MODULE here means the Lambda will crash\n' +
      '  on cold start. Pin the offending package or move the import to await import().',
  );
  process.exit(1);
}

console.log(`✔ all ${deps.length} runtime dependencies load under CommonJS on ${process.version}`);
