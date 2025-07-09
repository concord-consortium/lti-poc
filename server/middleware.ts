import * as jwt from 'jsonwebtoken'
import fs from "fs"
import path from "path"

import { localJWTSecret, logRequests, logRequestsPath } from "./config"

// ltijs has an setting for a server addon, which is a middleware function that runs before the request is processed

export const middleware = (app) => {

  // rewrite / to /index.html so that the static file is served
  app.use((req, res, next) => {
    if (req.path === '/') {
      req.url = '/index.html'
    }
    next()
  })

  // check if the request is for an API endpoint that requires a portal token
  app.use((req, res, next) => {
    // we do not check the portal token for the /api/v1/jwt/portal
    // endpoint, as this is used to generate the portal token itself
    const checkPortalToken = req.path.startsWith("/api/") && req.path !== "/api/v1/jwt/portal"
    if (checkPortalToken) {
      // authenticate the request using the locally generated portal token
      const portalToken = req.headers.authorization?.split(' ')[1]
      if (!portalToken) {
        return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Missing portal token.' } })
      }
      jwt.verify(portalToken, localJWTSecret, (err, decodedPortalToken) => {
        if (err) {
          return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Invalid portal token.' } })
        }
        res.locals.portalToken = decodedPortalToken
        // continue to the next middleware
        return next()
      })
    } else {
      return next()
    }
  })

  if (logRequests) {
    app.use((req, res, next) => {
      console.log("Logging request:", req.method, req.originalUrl);
      const logFilePath = path.join('/tmp', logRequestsPath);
      const chunks: any[] = [];

      // Capture the original send method
      const originalSend = res.send;

      res.send = function (body: any) {
        // Capture the response body
        if (body instanceof Buffer) {
          chunks.push(body);
        } else if (typeof body === 'string') {
          chunks.push(Buffer.from(body));
        } else {
          chunks.push(Buffer.from(JSON.stringify(body)));
        }

        // Call the original send method
        return originalSend.call(this, body);
      };

      res.on('finish', () => {
        const requestLine = `${req.method} ${res.statusCode} ${req.originalUrl}\n`;

        const requestBody = req.body && Object.keys(req.body).length > 0
          ? `${JSON.stringify(req.body, null, 2)}\n`
          : '[no request body]\n';

        const responseBody = chunks.length
          ? `${Buffer.concat(chunks).toString()}\n`
          : '[no response body]\n';

        const fullLog = `${requestLine}${requestBody}---\n${responseBody}\n`;

        fs.appendFile(logFilePath, fullLog, (err) => {
          if (err) {
            console.error('Failed to write to log file:', err);
          }
        });
      });

      next();
    });
  }
}
