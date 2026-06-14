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
// Angular 21.2.x hardened SSRF protection (CVE-2026-27739) now strips ALL
// X-Forwarded-* by default, so the x-forwarded-host we inject below (PUBLIC_HOST) is
// ignored and SSR silently deoptimizes to a CSR shell behind CloudFront → API Gateway.
// Trust only host+proto (NOT x-forwarded-prefix — the CVE's open-redirect vector);
// allowedHosts in angular.json remains the host-injection backstop.
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
    req.headers['host'] = publicHost;
    req.headers['x-forwarded-host'] = publicHost;
    // force https (was ??=) — we now trust x-forwarded-proto, so a direct
    // API-GW caller must not be able to spoof it; prod is always TLS-terminated.
    req.headers['x-forwarded-proto'] = 'https';
    next();
  });
}

/**
 * Handle all other requests by rendering the Angular application.
 */
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
