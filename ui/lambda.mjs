// use serverless-http which patches res and waits for end event
import serverlessHttp from 'serverless-http';
import { app } from './dist/ui/server/server.mjs';

export const handler = serverlessHttp(app);



// // CHANGED: manual API Gateway → Express bridge (fixes streaming issue)
// import { app } from './dist/ui/server/server.mjs';
//
// export const handler = (event, context) => {
//   context.callbackWaitsForEmptyEventLoop = false;
//
//   return new Promise((resolve, reject) => {
//     const { httpMethod, path, queryStringParameters, headers, body, isBase64Encoded } = event;
//
//     // Build mock IncomingMessage
//     const qs = queryStringParameters
//       ? '?' + new URLSearchParams(queryStringParameters).toString()
//       : '';
//
//     const req = Object.assign(
//       require('stream').Readable.from(
//         body ? [isBase64Encoded ? Buffer.from(body, 'base64') : Buffer.from(body)] : []
//       ),
//       {
//         method: httpMethod,
//         url: path + qs,
//         headers: headers || {},
//         connection: { encrypted: true },
//         socket: { encrypted: true },
//       }
//     );
//
//     // Collect response
//     const chunks = [];
//     const resHeaders = {};
//     let statusCode = 200;
//
//     const res = Object.assign(new (require('stream').PassThrough)(), {
//       statusCode,
//       setHeader(k, v) { resHeaders[k] = v; },
//       getHeader(k) { return resHeaders[k]; },
//       removeHeader(k) { delete resHeaders[k]; },
//       writeHead(code, hdrs = {}) {
//         statusCode = code;
//         Object.assign(resHeaders, hdrs);
//       },
//       end(chunk) {
//         if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
//         const responseBody = Buffer.concat(chunks).toString('base64');
//         resolve({
//           statusCode,
//           headers: resHeaders,
//           body: responseBody,
//           isBase64Encoded: true,
//         });
//       },
//       write(chunk) {
//         chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
//         return true;
//       },
//     });
//
//     app(req, res, (err) => {
//       if (err) reject(err);
//       else resolve({ statusCode: 404, body: 'Not found', headers: {} });
//     });
//   });
// };




// new file — Lambda entry point for Angular 21 SSR
// import serverlessExpress from '@codegenie/serverless-express';
// import { app } from './dist/ui/server/server.mjs';
//
// let cachedHandler;
//
// export const handler = async (event, context) => {
//   if (!cachedHandler) {
//     cachedHandler = serverlessExpress({ app });
//   }
//   return cachedHandler(event, context);
// };
