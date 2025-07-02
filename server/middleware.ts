import * as jwt from 'jsonwebtoken'

import { localJWTSecret } from "./config"

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
}
