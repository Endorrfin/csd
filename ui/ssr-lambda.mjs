// Lambda entry point for Angular 21 SSR (ESM)
import { handler as angularHandler } from './dist/ui/server/server.mjs';
import serverlessHttp from 'serverless-http';

// Angular 21 server.mjs exports a fetch-based reqHandler
// serverless-http wraps it for API Gateway Lambda proxy format
export const handler = serverlessHttp(angularHandler);
