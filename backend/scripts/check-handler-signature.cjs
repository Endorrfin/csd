// === ADDED: Lambda handler signature check ===
//
// Why this exists:
//   From nodejs24.x the Lambda runtime refuses any exported handler that declares a
//   `callback` parameter and fails init with Runtime.CallbackHandlerDeprecated. The
//   function never serves a request, so every route answers 502. It surfaced on
//   staging only because nothing in `npm run verify` calls the real handler: Jest
//   tests the Nest services, and `check:cjs` only require()s the dependencies.
//   See docs/ARCHITECTURE.md §15, Incident #5.
//
// What it checks: the compiled `dist/lambda.js` exports a `handler` whose declared
//   arity is at most 2 (event, context). This is the same signal the runtime reads
//   (Function.length), so the check cannot drift from it.
//
// Runs AFTER `nest build` (it needs dist/). Optional argv[2] overrides the path,
//   used to prove the check fails on a bad signature.
//
// Deliberately plain CommonJS, like check-cjs-load.cjs.

'use strict';

const path = require('node:path');

const target = path.resolve(process.argv[2] ?? path.join(__dirname, '..', 'dist', 'lambda.js'));

let mod;
try {
  mod = require(target);
} catch (err) {
  console.error(`✖ Cannot load ${target}: ${err.message.split('\n')[0]}`);
  console.error('  Run `npm run build` first; this check reads the compiled handler.');
  process.exit(1);
}

if (typeof mod.handler !== 'function') {
  console.error(`✖ ${target} does not export a \`handler\` function.`);
  process.exit(1);
}

const MAX_PARAMS = 2;
if (mod.handler.length > MAX_PARAMS) {
  console.error(
    `✖ Lambda handler declares ${mod.handler.length} parameters; the maximum is ${MAX_PARAMS} (event, context).\n` +
      '  nodejs24.x rejects callback-style handlers with Runtime.CallbackHandlerDeprecated,\n' +
      '  and the function would answer 502 on every route.',
  );
  process.exit(1);
}

console.log(`✔ Lambda handler takes ${mod.handler.length} parameter(s) (max ${MAX_PARAMS})`);
// Importing the Nest app can leave handles open; this is a one-shot check.
process.exit(0);
