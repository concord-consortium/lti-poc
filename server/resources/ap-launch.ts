import * as jwt from "jsonwebtoken"

import { localJWTSecret, localJWTAlg, publicUrl, apBaseUrl, clueBaseUrl } from "../config";
import { getUserType, getTeacherPage } from "../helpers";
import { ApTool, ClueTool } from "../catalog/resources";

export const apLaunchDemo = (res: any, token: any) => {
  apLaunch(res, token, {type: "ap", activity: "https://authoring.lara.staging.concord.org/api/v1/activities/1416.json"});
}

export const apLaunch = (res: any, token: any, tool: ApTool) => {
  // reencode the token to a JWT that we can verify the signature of
  const localJWT = jwt.sign(token, localJWTSecret, {algorithm: localJWTAlg})

  const rawAPParams: any = {
    domain: `${publicUrl}/`,
    token: localJWT,
    answersSourceKey: new URL(token.iss).hostname, // this is the platform URL
  }
  if (tool.activity) {
    rawAPParams.activity = tool.activity;
  } else if (tool.sequence) {
    rawAPParams.sequence = tool.sequence;
  } else {
    return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing required fields: activity or sequence.' } });
  }
  const isProd = (rawAPParams.activity ?? rawAPParams.sequence).includes("authoring.concord.org");
  const firebaseApp = isProd ? "report-service-pro" : "report-service-dev";
  const sourceKey = isProd ? "authoring.concord.org" : "authoring.lara.staging.concord.org";

  // ensure AP writes to the correct Firebase database
  rawAPParams.firebaseApp = firebaseApp;

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

      const offeringId = 0; // not available in LTI but we can use the info from the token
      const classId = token.platformContext?.context?.id ?? 0;
      // use this for local dashboard testing
      // const dashboardUrl = new URL("http://localhost:8080/");
      const dashboardUrl = new URL("https://portal-report.concord.org/branch/master/index.html");
      dashboardUrl.search = new URLSearchParams({
        answersSourceKey: rawAPParams.answersSourceKey,
        class: `${publicUrl}/api/v1/classes/${classId}`,
        classOfferings: `${publicUrl}/api/v1/offerings?class_id=${classId}`,
        "firebase-app": firebaseApp,
        offering: `${publicUrl}/api/v1/offerings/${offeringId}`,
        "portal-dashboard": "",
        reportType: "offering",
        sourceKey,
        token: localJWT
      }).toString();

      return res.status(200).send(getTeacherPage({apUrl: apUrl.toString(), teUrl: teUrl.toString(), dashboardUrl: dashboardUrl.toString()}));
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
}

export const clueLaunch = (res: any, token: any, tool: ClueTool) => {
  // reencode the token to a JWT that we can verify the signature of
  const localJWT = jwt.sign(token, localJWTSecret, {algorithm: localJWTAlg})
  const rawCLUEParams: any = {
    domain: `${publicUrl}/`,
    token: localJWT,
    answersSourceKey: new URL(token.iss).hostname, // this is the platform URL
  }

  const { problem, unit } = tool;
  if (problem && unit) {
    rawCLUEParams.problem = problem;
    rawCLUEParams.unit = unit;
  } else {
    return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing required fields: problem or unit.' } });
  }

  const isProd = clueBaseUrl.includes("collaborative-learning.concord.org");
  const firebaseApp = isProd ? "report-service-pro" : "report-service-dev";
  // const sourceKey = isProd ? "authoring.concord.org" : "authoring.lara.staging.concord.org";

  rawCLUEParams.firebaseApp = firebaseApp;
  const clueUrl = new URL(clueBaseUrl);
  clueUrl.search = new URLSearchParams(rawCLUEParams).toString();

  switch (getUserType(token, {treatAdministratorAsLearner: true})) {
    case "learner":
      return res.redirect(clueUrl.toString());
      break;

    case "teacher":
      return res.redirect(clueUrl.toString());
      break;

    default:
      return res.status(403).send("This tool is only available for learners and teachers.");
  }
}
