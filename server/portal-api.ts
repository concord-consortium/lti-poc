import * as jwt from 'jsonwebtoken'

import { localJWTSecret, publicUrl, localJWTAlg, reportServiceDevConfig, reportServiceProConfig, tokenServiceConfig, apBaseUrl } from "./config";
import { getUserType, getUserId, getUserInfo, computeClassHash, ensureTrailingSlash, computeUidHash } from "./helpers";
import { addToWhitelist } from './whitelist';
import { findResource } from './catalog/resources';

// these are routes that our LTI tool exposes to fake being a portal (eg learn.concord.org) so that it can return
// class and offering information and hand out portal and firebase JWTs

export const addPortalApiRoutes = (lti: any) => {
  // add the routes to the whitelist so they are not checked during LTI authentication
  addToWhitelist(
    "/api/v1/jwt/portal",
    "/api/v1/jwt/firebase",
    {route: new RegExp("/api/v1/classes/\\d+"), method: "GET"},
    {route: new RegExp("/api/v1/offerings/\\d+"), method: "GET"},
  )

  // receives a signed JWT of the LMS token, signed with the localJWTSecret and returns a JWT that looks like it came from the portal
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

  const getOfferingInfo = (token: any) => {
    const {resource, custom} = token.platformContext;

    let activityUrl = `${ensureTrailingSlash(token.iss)}${resource.id}`
    if (custom?.slug) {
      const resourceInfo = findResource(custom.slug);
      if (resourceInfo && resourceInfo.tool !== "internal") {
        const rawAPParams: any = {};
        if (resourceInfo.tool.activity) {
          rawAPParams.activity = resourceInfo.tool.activity;
        } else if (resourceInfo.tool.sequence) {
          rawAPParams.sequence = resourceInfo.tool.sequence;
        }
        const apUrl = new URL(apBaseUrl);
        apUrl.search = new URLSearchParams(rawAPParams).toString();

        activityUrl = apUrl.toString();
      }
    }

    const offeringInfo: any = {
      id: resource.id,
      activity_url: activityUrl,
      rubric_url: null, // TODO: figure out if this is available in LTI
      locked: false, // TODO: figure out if this is available in LTI
    }

    return offeringInfo;
  }

  lti.app.get('/api/v1/classes/:id', async (req, res) => {
    // NOTE: we ignore the id here, we use the getMembers method to get the class info
    // which uses the class information in the LTI token
    const token = res.locals.portalToken.ltiToken || res.locals.portalToken;
    // const {ltiToken} = res.locals.portalToken;

    const classInfo: any = {
      id: token.platformContext.context.id,
      platformUserId: "TODO",
      name: token.platformContext.context.title,
      class_hash: computeClassHash(token.platformContext.context.id),
      students: [],
      teachers: [],
      external_class_reports: [],
      offering: getOfferingInfo(token),
    }

    const response = await lti.NamesAndRoles.getMembers(token)
    const members = response.members || [];
    members.forEach(member => {
      // check status for active?
      // if (member.status !== 'Active') {
      //   return;
      // }

      const user = {
        id: `${ensureTrailingSlash(token.iss)}${member.user_id}`,
        user_id: member.user_id,
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
    // the token here can either be a LTI token or a portal token depending if AP or the dashboard is calling this endpoint
    const token = res.locals.portalToken.ltiToken || res.locals.portalToken;

    const offeringInfo = getOfferingInfo(token);

    if (req.query?.class_id) {
      // if class_id is provided, we return as an array of offerings
      return res.status(200).send([offeringInfo]);
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

    if (!["report-service-dev", "report-service-pro", "token-service"].includes(firebase_app)) {
      return res.status(400).send({
        status: 400,
        error: 'Bad Request',
        details: { message: 'Invalid firebase_app. Only "report-service-dev", "report-service-pro", and "token-service" are supported.' }
      });
    }
    const firebaseConfig =
      firebase_app === 'report-service-dev' ? reportServiceDevConfig :
      firebase_app === 'report-service-pro' ? reportServiceProConfig :
      tokenServiceConfig;

    // the token here can either be a LTI token or a portal token depending if AP or the dashboard is calling this endpoint
    const token = res.locals.portalToken.ltiToken || res.locals.portalToken;
    // const { ltiToken } = res.locals.portalToken;
    const userId = getUserId(token);

    const subClaims: any = {
      platform_id: token.iss,
      platform_user_id: token.user,
      user_id: userId,
    }

    const classHash = computeClassHash(token.platformContext.context.id);

    switch (getUserType(token, {treatAdministratorAsLearner: true})) {
      case 'learner':
        subClaims.user_type = 'learner';
        subClaims.class_hash = classHash;
        subClaims.offering_id = token.platformContext?.resource?.id ?? 'n/a';
        break;
      case 'teacher':
        subClaims.user_type = 'teacher';
        subClaims.class_hash = classHash;
        break;
      default:
        const { given_name, family_name } = getUserInfo(token);
        subClaims.user_type = 'user';
        break;
    }

    // NOTE: this only handles enough claims to satisfy the Firebase auth rules for learners and teachers.
    // it does not handle researchers or the teacher having a class_hash or resource_link_id parameters

    // on the portal the returnUrl is the remote_endpoint_url - we build a similar unique url here
    const {user, context: { id: contextId }, resource: { id: resourceId }} = token.platformContext;
    const returnUrl = `${token.iss}/${user}-${contextId}-${resourceId}`;

    const response: any = {
      // Firebase auth rules expect all the claims to be in a sub-object named "claims".
      claims: subClaims,
      uid: computeUidHash(userId),
      returnUrl
    }

    const firebaseToken = jwt.sign(response, firebaseConfig.privateKey, {
      algorithm: 'RS256',
      issuer: firebaseConfig.clientEmail,
      subject: firebaseConfig.clientEmail,
      audience: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      expiresIn: "1h",
    })

    return res.status(200).send({token: firebaseToken});
  });
}