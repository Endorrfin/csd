// path: ui/src/server.ts
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// Angular 21.2.x SSRF hardening (CVE-2026-27739): sanitizeRequestHeaders() flips
// deoptToCSR=true on ANY untrusted X-Forwarded-* header → the engine silently serves the
// CSR shell (no error logged). Default already trusts only x-forwarded-host/-proto; we keep
// that explicit AND strip the untrusted ones (x-forwarded-for/-port from API GW) in the
// middleware below. allowedHosts (angular.json) stays the host-injection backstop.
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * restore the public hostname behind API Gateway (audit P0-3).
 * Behind CloudFront → API Gateway the request arrives with the execute-api
 * hostname. Angular SSR host validation (SSRF protection) rejects it and
 * silently falls back to a CSR shell — no server-rendered content, no SEO.
 * PUBLIC_HOST is set only in ui/serverless.yml (prod Lambda); locally this
 * middleware is a no-op.
 */
const publicHost = process.env['PUBLIC_HOST'];
if (publicHost) {
  app.use((req, _res, next) => {
    // CHANGED: drop untrusted X-Forwarded-* (API GW sends x-forwarded-for/-port) — ANY of
    // them makes Angular SSR deopt to a CSR shell. Dropping x-forwarded-prefix also closes
    // the CVE-2026-27739 vector. Then pin host/proto to the trusted public values.
    delete req.headers['x-forwarded-for'];
    delete req.headers['x-forwarded-port'];
    delete req.headers['x-forwarded-prefix'];
    req.headers['host'] = publicHost;
    req.headers['x-forwarded-host'] = publicHost;
    req.headers['x-forwarded-proto'] = 'https'; // prod is always TLS-terminated by API GW
    next();
  });
}

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

// export app for Lambda wrapper (@codegenie/serverless-express)
export { app };
