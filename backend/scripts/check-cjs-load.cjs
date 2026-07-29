// === ADDED: production module-load smoke check ===
//
// Why this exists:
//   `nest build` emits CommonJS and the Lambda bundle loads it with require().
//   Parts of our dependency graph are now ESM-only — sanitize-html >= 2.17.6
//   pulls htmlparser2 v12 ("type": "module", no `require` export condition).
//   Node >= 22.12 handles that through require(esm); older Node throws
//   ERR_REQUIRE_ESM at cold start, which is how the isomorphic-dompurify
//   attempt died (see src/common/pipes/sanitize-html.pipe.ts).
//
//   Jest can no longer catch this: transformIgnorePatterns + ts-jest downlevel
//   those files to CJS, so the test suite proves nothing about how Lambda
//   actually loads them. This script exercises the real, untransformed path.
//
// Deliberately plain CommonJS — no ts-node, no transform, no jest.

'use strict';

const MIN_NODE = [22, 12, 0];

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
    `✖ Node ${process.version} is too old. This dependency graph contains ESM-only\n` +
      `  packages and needs require(esm), which landed in Node ${MIN_NODE.join('.')}.`,
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
