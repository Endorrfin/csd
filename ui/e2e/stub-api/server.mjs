// ui/e2e/stub-api/server.mjs
//
// Stub backend for the Playwright suite. It listens on the port that
// src/environments/environment.ts points ApiService at (http://localhost:3000),
// so BOTH the SSR process and the browser talk to it.
//
// Why not page.route()? This app renders the first paint in Node, and
// provideClientHydration() ships the result to the browser through the HTTP
// transfer cache. Server-side requests never touch the browser's network stack,
// and the client never re-requests what SSR already fetched — so a page.route()
// mock is bypassed entirely on initial load. A real process on :3000 is the only
// interception point that both halves of the app go through.
//
// Phase 2 (real backend + Postgres in docker compose) replaces this file.
// Deliberately dependency-free apart from express, which ui already depends on.
import express from 'express';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixture = (name) => JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));

const blogFeatured = fixture('blog-featured.json');
const blogPosts = fixture('blog-list.json');

const app = express();
app.use(express.json());

// The SSR app is served from :4000, this stub from :3000 — every browser call is
// cross-origin, and the JSON content type makes it a preflighted one.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-turnstile-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Only the endpoints the current specs actually reach are stubbed. Adding
// speculative handlers hides gaps; the 501 catch-all at the bottom names the
// missing route the moment a new spec needs one.
app.get('/api/blog/featured', (_req, res) => {
  res.json(blogFeatured);
});

app.get('/api/blog', (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const items = blogPosts.slice((page - 1) * limit, page * limit);
  res.json({
    items,
    total: blogPosts.length,
    page,
    limit,
    hasMore: page * limit < blogPosts.length,
  });
});

// Mirrors the real DTO's required fields. Answering 201 to anything would make
// the contact spec pass even if the component stopped sending a message at all.
app.post('/api/inquiries', (req, res) => {
  const { reason, message } = req.body ?? {};
  if (!reason || !message) {
    res.status(400).json({ message: 'stub-api: reason and message are required' });
    return;
  }
  res
    .status(201)
    .json({ id: 'e2e-stub-inquiry', createdAt: new Date().toISOString(), ...req.body });
});

// An unstubbed /api/* path is a real gap — the app asked for an endpoint this
// file does not implement — so it answers 501 and logs loudly. A silent 404 would
// be swallowed by the components' error branches and surface as an inexplicable
// empty page.
app.use('/api', (req, res) => {
  console.error(`[stub-api] unhandled ${req.method} ${req.originalUrl}`);
  res.status(501).json({ message: `stub-api: no handler for ${req.method} ${req.originalUrl}` });
});

// Everything else on this port is not the app under test: a stray browser tab
// left open on localhost:3000, a favicon fetch, a devtools probe. Silent 404 —
// logging it would put "unhandled" lines in the run output that look like test
// failures and are not.
app.use((_req, res) => {
  res.sendStatus(404);
});

const port = Number(process.env.STUB_API_PORT ?? 3000);
app.listen(port, () => {
  console.log(`[stub-api] listening on http://localhost:${port}`);
});
