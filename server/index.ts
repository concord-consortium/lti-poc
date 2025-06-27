import path from 'path'
import * as jwt from 'jsonwebtoken'
import { computeClassHash, computeUidHash, ensureTrailingSlash, getTeacherPage, getUserId, getUserInfo, getUserType } from './helpers'
import fs from 'fs'
import 'dotenv/config'

// the ltijs types are old and not compatible with the latest version of ltijs
// import {Provider as lti} from 'ltijs'

const lti = require('ltijs').Provider
const Database = require('ltijs-sequelize')

const requiredEnvVars = ['PUBLIC_URL', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'LOCAL_JWT_SECRET', 'LTI_KEY', 'AP_BASE_URL']
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

let publicUrl = process.env.PUBLIC_URL!
if (publicUrl.endsWith('/')) {
  publicUrl = publicUrl.slice(0, -1)
}

const dbName = process.env.DB_NAME!
const dbUsername = process.env.DB_USERNAME!
const dbPassword = process.env.DB_PASSWORD!
const dbHost = process.env.DB_HOST!
const dbPort = process.env.DB_PORT!
const localJWTSecret = process.env.LOCAL_JWT_SECRET!
const ltiKey = process.env.LTI_KEY!
const apBaseUrl = process.env.AP_BASE_URL!

let firebaseAppConfig: {clientEmail: string, privateKey: string}
try {
  const configPath = path.join(__dirname, 'firebase-configs', 'report-service-dev.json')
  const configContent = fs.readFileSync(configPath, 'utf8')
  firebaseAppConfig = JSON.parse(configContent)
  if (!firebaseAppConfig.privateKey || typeof firebaseAppConfig.privateKey !== 'string' || !firebaseAppConfig.privateKey.trim()) {
    throw new Error('Missing or empty "privateKey" in report-service-dev.json')
  }
  if (!firebaseAppConfig.clientEmail || typeof firebaseAppConfig.clientEmail !== 'string' || !firebaseAppConfig.clientEmail.trim()) {
    throw new Error('Missing or empty "clientEmail" in report-service-dev.json')
  }
} catch (err) {
  throw new Error(`Failed to load or parse report-service-dev.json: ${err.message}`)
}

const localJWTAlg = 'HS256'

const db = new Database(dbName, dbUsername, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false
})

lti.setup(ltiKey, // Key used to sign cookies and tokens
  {
    plugin: db
  },
  {
    appRoute: '/launch',
    loginRoute: '/login',
    cookies: {
      secure: false,
      sameSite: ''
    },
    devMode: true,
    dynRegRoute: '/register', // Setting up dynamic registration route. Defaults to '/register'
    dynReg: {
      url: publicUrl, // Tool Provider URL. Required field.
      name: 'LTI POC', // Tool Provider name. Required field.
      logo: "https://cc-project-resources.s3.us-east-1.amazonaws.com/lti-poc-logo/cc-logo-small.svg", // Tool Provider logo URL.
      description: 'LTI Proof-of-concept', // Tool Provider description.
      redirectUris: [], // Additional redirection URLs. The main URL is added by default.
      customParameters: { key: 'value' }, // Custom parameters.
      autoActivate: true // Whether or not dynamically registered Platforms should be automatically activated. Defaults to false.
    },
  }
)

lti.whitelist(
  "/",
  '/api/v1/jwt/portal',
  '/api/v1/jwt/firebase',
  {route: new RegExp('/api/v1/classes/\\d+'), method: "GET"},
  {route: new RegExp('/api/v1/offerings/\\d+'), method: "GET"},
)

lti.app.use((req, res, next) => {
  // check if the request is for an API endpoint that requires a portal token
  // we do not check the portal token for the /api/v1/jwt/portal
  // endpoint, as this is used to generate the portal token itself
  const checkPortalToken = req.path.startsWith("/api/") && req.path !== "/api/v1/jwt/portal"
  if (checkPortalToken) {
    // authenticate the request using the locally generated portal token
    const portalToken = req.headers.authorization?.split(' ')[1];
    if (!portalToken) {
      return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Missing portal token.' } });
    }
    jwt.verify(portalToken, localJWTSecret, (err, decodedPortalToken) => {
      if (err) {
        return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Invalid portal token.' } });
      }
      res.locals.portalToken = decodedPortalToken;
      // continue to the next middleware
      return next();
    });
  } else {
    return next();
  }
});

lti.onConnect(async (token, req, res) => {
  const debug = (output: any) => {
    return res.send(`<div style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify(output, null, 2)}</div>`)
  }

  switch (token.platformContext?.custom?.slug) {
    case "token-debugger":
      return debug(token)

    case "names-and-roles-demo":
      const response = await lti.NamesAndRoles.getMembers(token)
      return debug(response)

    case "ap-launch-demo":
      // reencode the token to a JWT that we can verify the signature of
      const localJWT = jwt.sign(token, localJWTSecret, {algorithm: localJWTAlg})

      const rawAPParams = {
        activity: "https://authoring.lara.staging.concord.org/api/v1/activities/1416.json",
        domain: `${publicUrl}/`,
        token: localJWT,
        answersSourceKey: new URL(token.iss).hostname, // this is the platform URL
      }
      const apUrl = new URL(apBaseUrl);
      apUrl.search = new URLSearchParams(rawAPParams).toString();

      switch (getUserType(token, {treatAdministratorAsLearner: true})) {
        case "learner":
          return res.redirect(apUrl.toString());
          break;

        case "teacher":
          const teacherEditionParams = new URLSearchParams({...rawAPParams,
            mode: "teacher-edition",
            show_index: "true",
          })
          const teUrl = new URL(apUrl);
          teUrl.search = teacherEditionParams.toString();

          return res.status(200).send(getTeacherPage({apUrl: apUrl.toString(), teUrl: teUrl.toString()}));
          break

        default:
          return res.status(403).send("This tool is only available for learners and teachers.");
      }
      /*
        teacher notes:

        - the portal offering api response has a has_teacher_edition boolean and reports that look like this:
          "external_reports": [{
            "id": 1,
            "name": "Activity Player Class Dashboard",
            "url": "https://learn.portal.staging.concord.org/portal/offerings/1167/external_report/1",
            "launch_text": "Class Dashboard",
            "supports_researchers": true
          }]

      */

    default:
      return res.send("Unknown slug!")
  }
})

lti.onDynamicRegistration(async (req, res, next) => {
  try {
    if (!req.query.openid_configuration) return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing parameter: "openid_configuration".' } })
    const message = await lti.DynamicRegistration.register(req.query.openid_configuration, req.query.registration_token, {
      'https://purl.imsglobal.org/spec/lti-tool-configuration': {
        custom_parameters: {
          'custom1': 'value1',
          'custom2': 'value2'
        }
      }
    })
    res.setHeader('Content-type', 'text/html')
    res.send(message)
  } catch (err) {
    if (err.message === 'PLATFORM_ALREADY_REGISTERED') return res.status(403).send({ status: 403, error: 'Forbidden', details: { message: 'Platform already registered.' } })
    return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } })
  }
})

// Deep Linking callback
lti.onDeepLinking((token, req, res) => {
  return res.sendFile(path.join(__dirname, './public/resources.html'))
})

lti.app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'))
});

lti.app.post('/deeplink', async (req, res) => {
  const resource = req.body

  const items = [
    {
      type: 'ltiResourceLink',
      title: resource.title,
      url: `${publicUrl}/launch`,
      custom: {
        slug: resource.slug
      }
    }
  ]

  // Creates the deep linking request form
  const form = await lti.DeepLinking.createDeepLinkingForm(res.locals.token, items, { message: 'Successfully registered resource!' })

  return res.send(form)
})

// receives a signel JWT of the LMS token, signed with the localJWTSecret and returns a JWT that looks like it came from the portal
lti.app.get('/api/v1/jwt/portal', (req, res) => {
  // the token here is the generated JWT from ltijs signed with the localJWTSecret
  if (!req.token) {
    return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing token.' } })
  }

  jwt.verify(req.token, localJWTSecret, (err, decodedToken) => {
    if (err) {
      return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Invalid token.' } });
    }

    const userType = getUserType(decodedToken, {treatAdministratorAsLearner: true});
    let claims: Record<string, any> = {
      uid: decodedToken.user,
      domain: `${publicUrl}/`,
      user_type: userType,
      user_id: getUserId(decodedToken),
    };
    switch (userType) {
      case "learner":
        claims = {...claims, ...{
          learner_id: "n/a",
          class_info_url: `${publicUrl}/api/v1/classes/${decodedToken.platformContext?.context?.id ?? 0}`,
          offering_id: decodedToken.platformContext?.resource?.id ?? "n/a",
        }}
        break;

      case "teacher":
        claims.teacher_id = "n/a";
        break;

      default:
        const {given_name, family_name} = getUserInfo(decodedToken);
        claims = {...claims, ...{
          first_name: given_name,
          last_name: family_name,
          teacher: false,
          student: false
        }};
        break;
    }
    claims.ltiToken = decodedToken

    const portalToken = jwt.sign(claims, localJWTSecret, { algorithm: localJWTAlg, expiresIn: '1h' });
    return res.status(201).send({ token: portalToken });
  });
});

lti.app.get('/api/v1/classes/:id', async (req, res) => {
  // NOTE: we ignore the id here, we use the getMembers method to get the class info
  // which uses the class information in the LTI token
  const {ltiToken} = res.locals.portalToken;

  const classInfo: any = {
    name: ltiToken.platformContext.context.title,
    class_hash: computeClassHash(ltiToken.platformContext.contextId),
    students: [],
    teachers: [],
    external_class_reports: [],
  }

  const response = await lti.NamesAndRoles.getMembers(ltiToken)
  const members = response.members || [];
  members.forEach(member => {
    // check status for active?
    // if (member.status !== 'Active') {
    //   return;
    // }

    const user = {
      id: `${ensureTrailingSlash(ltiToken.iss)}${member.user_id}`,
      first_name: member.given_name || '',
      last_name: member.family_name || '',
    }

    if (member.roles.includes("Learner")) {
      classInfo.students.push(user);
    } else if (member.roles.includes("Instructor")) {
      classInfo.teachers.push(user);
    }
  });

  return res.status(200).send(classInfo);
});

lti.app.get('/api/v1/offerings/:id', async (req, res) => {
  // NOTE: we ignore the id here and instead use the values in the LTI token
  const {ltiToken} = res.locals.portalToken;
  const {resource} = ltiToken.platformContext;

  const offeringInfo: any = {
    id: resource.id,
    activity_url: `${ensureTrailingSlash(ltiToken.iss)}${resource.id}`,
    rubric_url: null, // TODO: figure out if this is available in LTI
    locked: false, // TODO: figure out if this is available in LTI
  }

  return res.status(200).send(offeringInfo);
});

lti.app.get('/api/v1/jwt/firebase', async (req, res) => {
  const { firebase_app, class_hash } = req.query;
  if (!firebase_app || !class_hash) {
    return res.status(400).send({
      status: 400,
      error: 'Bad Request',
      details: { message: 'Missing required query parameters: firebase_app and class_hash.' }
    });
  }

  if (firebase_app !== 'report-service-dev') {
    return res.status(400).send({
      status: 400,
      error: 'Bad Request',
      details: { message: 'Invalid firebase_app. Only "report-service-dev" is supported.' }
    });
  }

  const { ltiToken } = res.locals.portalToken;
  const userId = getUserId(ltiToken);

  const subClaims: any = {
    platform_id: ltiToken.iss,
    platform_user_id: ltiToken.user,
    user_id: userId,
  }

  const classHash = computeClassHash(ltiToken.platformContext.contextId);

  switch (getUserType(ltiToken, {treatAdministratorAsLearner: true})) {
    case 'learner':
      subClaims.user_type = 'learner';
      subClaims.class_hash = classHash;
      subClaims.offering_id = ltiToken.platformContext?.resource?.id ?? 'n/a';
      break;
    case 'teacher':
      subClaims.user_type = 'teacher';
      subClaims.class_hash = classHash;
      break;
    default:
      const { given_name, family_name } = getUserInfo(ltiToken);
      subClaims.user_type = 'user';
      break;
  }

  // NOTE: this only handles enough claims to satisfy the Firebase auth rules for learners and teachers.
  // it does not handle researchers or the teacher having a class_hash or resource_link_id parameters

  // on the portal the returnUrl is the remote_endpoint_url - we build a similar unique url here
  const {user, context: { id: contextId }, resource: { id: resourceId }} = ltiToken.platformContext;
  const returnUrl = `${ltiToken.iss}/${user}-${contextId}-${resourceId}`;

  const response: any = {
    // Firebase auth rules expect all the claims to be in a sub-object named "claims".
    claims: subClaims,
    uid: computeUidHash(userId),
    returnUrl
  }

  const firebaseToken = jwt.sign(response, firebaseAppConfig.privateKey, {
    algorithm: 'RS256',
    issuer: firebaseAppConfig.clientEmail,
    subject: firebaseAppConfig.clientEmail,
    audience: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    expiresIn: "1h",
  })

  return res.status(200).send({token: firebaseToken});
});

const setup = async () => {
  await lti.deploy({ port: 3000 })
}

setup()
