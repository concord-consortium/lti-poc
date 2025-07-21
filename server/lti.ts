import path from "path"

import { dynamicRegistrationName, ltiKey, publicUrl } from "./config"
import { db } from "./db"
import { middleware } from "./middleware"
import { apLaunch, apLaunchDemo } from "./resources/ap-launch"
import { gradingDemo } from "./resources/grading-demo"
import { findResource } from "./catalog/resources"
import { clients } from "./catalog/clients"

// the ltijs types are old and not compatible with the latest version of ltijs
// import {Provider as lti} from 'ltijs'
export const lti = require("ltijs").Provider

lti.setup(ltiKey,
  {
    plugin: db
  },
  {
    appRoute: "/launch",
    loginRoute: "/login",
    cookies: {
      secure: false,
      sameSite: ""
    },
    devMode: true,
    dynRegRoute: "/register",
    dynReg: {
      url: publicUrl,
      name: dynamicRegistrationName,
      logo: "https://cc-project-resources.s3.us-east-1.amazonaws.com/lti-poc-logo/cc-logo-small.svg",
      description: "LTI Proof-of-concept",
      redirectUris: [],
      customParameters: {
        // add any custom parameters you want to include in the registration
      },
      autoActivate: true
    },
    staticPath: path.join(__dirname, "public"),
    serverAddon: middleware
  }
)

lti.onConnect(async (token, req, res) => {
  const slug = token.platformContext?.custom?.slug
  const debug = (output: any) => {
    return res.send(`<div style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify(output, null, 2)}</div>`)
  }

  const resource = findResource(slug)
  if (!resource) {
    return res.send(`Unknown resource: ${slug}!`)
  }

  if (resource.tool === "internal") {
    switch (slug) {
      case "token-debugger":
        return debug(token)

      case "names-and-roles-demo":
        return debug(await lti.NamesAndRoles.getMembers(token))

      case "ap-launch-demo":
        return apLaunchDemo(res, token)

      case "grading-demo":
        return gradingDemo(lti, req, res, token)

      default:
        return res.send(`Unknown internal resource: ${slug}!`)
    }
  }

  if (resource.tool.type === "ap") {
    return apLaunch(res, token, resource.tool)
  }

  return res.send(`Unknown resource tool: ${resource.tool.type}!`)
})

lti.onDynamicRegistration(async (req, res, next) => {
  try {
    if (!req.query.openid_configuration) return res.status(400).send({ status: 400, error: "Bad Request", details: { message: `Missing parameter: "openid_configuration".` } })
    const message = await lti.DynamicRegistration.register(req.query.openid_configuration, req.query.registration_token, {
      "https://purl.imsglobal.org/spec/lti-tool-configuration": {
        custom_parameters: {
          // add any custom parameters you want to include in the registration
        }
      }
    })
    res.setHeader("Content-type", "text/html")
    res.send(message)
  } catch (err) {
    if (err.message === "PLATFORM_ALREADY_REGISTERED") return res.status(403).send({ status: 403, error: "Forbidden", details: { message: "Platform already registered." } })
    return res.status(500).send({ status: 500, error: "Internal Server Error", details: { message: err.message } })
  }
})

lti.onDeepLinking((token, req, res) => {
  return res.sendFile(path.join(__dirname, "./public/resources.html"))
})

// possible callbacks to use in the future but not needed or implemented for now
// these should be implmented in the real server!
/*

// https://cvmcosta.me/ltijs/#/provider?id=provideronsessiontimeoutsessiontimeoutcallback
lti.onSessionTimeout(async (req, res, next) => { return res.status(401).send(res.locals.err) })

// https://cvmcosta.me/ltijs/#/provider?id=provideroninvalidtokeninvalidtokencallback
lti.onInvalidToken(async (req, res, next) => { return res.status(401).send(res.locals.err) })

// https://cvmcosta.me/ltijs/#/provider?id=provideronunregisteredplatformunregisteredplatformcallback
lti.onUnregisteredPlatform((req, res) => { return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Unregistered Platform!' } }) })

// https://cvmcosta.me/ltijs/#/provider?id=provideroninactiveplatforminactiveplatformcallback
lti.onInactivePlatform((req, res) => { return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Platform not active!' } }) })
*/

// any code that should run after the deployment of the LTI server
export const postDeployment = () => {

  // register all enabled Schoology clients (they are not automatically registered)
  const clientIds = clients.filter(c => c.platform === "schoology" && !c.disabled).map(c => c.id)
  for (const clientId of clientIds) {
    console.log(`Registering Schoology client ID: ${clientId}`)
    lti.registerPlatform({
      url: 'https://schoology.schoology.com',
      name: 'Schoology',
      clientId,
      authenticationEndpoint: 'https://lti-service.svc.schoology.com/lti-service/authorize-redirect',
      accesstokenEndpoint: 'https://lti-service.svc.schoology.com/lti-service/access-token',
      authConfig: { method: 'JWK_SET', key: 'https://lti-service.svc.schoology.com/lti-service/.well-known/jwks' }
    })
  }
}
