// backend/src/common/security-headers.ts
// centralised security headers (Batch 1)
// Single helmet config applied by BOTH bootstraps — lambda.ts (prod,
// serverless-express) and main.ts (local). Mirrors the shared-helper pattern
// already used for CORS (frontend-urls.ts) and env checks (assert-required-env.ts).
//
// Scope: this is a JSON/binary API (no HTML views, no Swagger), so the CSP is
// locked to 'none' — it costs nothing today and hardens any future HTML/error
// output. The browser-facing CSP that actually protects end users is set on
// CloudFront for www.csd-fund.org, NOT here.
import helmet from 'helmet';
import type { RequestHandler } from 'express';

export function securityHeaders(): RequestHandler {
  return helmet({
    // No HTML is served from the API → forbid every resource type by default.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'none'"],
        'base-uri': ["'none'"],
        'form-action': ["'none'"],
        'frame-ancestors': ["'none'"],
      },
    },
    // HSTS is also (authoritatively) set at CloudFront for the public domain;
    // the API is HTTPS-only behind API Gateway, so a conservative HSTS here is safe.
    hsts: { maxAge: 15552000, includeSubDomains: true, preload: false },
    // helmet defaults already provide: X-Content-Type-Options: nosniff,
    // frameguard (X-Frame-Options: SAMEORIGIN), Referrer-Policy: no-referrer,
    // COOP: same-origin, CORP: same-origin, X-Permitted-Cross-Domain-Policies: none,
    // and X-Powered-By removal. COEP stays OFF (default) — enabling it would break
    // legitimate cross-origin loads.
  });
}
