import { createHash } from "crypto";

export const arrayIncludesSubstring = (array: string[], substring: string) => {
  return array.some(item => item.includes(substring));
}

export const getUserType = (decodedToken: any) => {
  if (arrayIncludesSubstring(decodedToken.platformContext?.roles ?? [], '#Instructor')) {
    return 'teacher';
  }
  if (arrayIncludesSubstring(decodedToken.platformContext?.roles ?? [], '#Learner')) {
    return 'learner';
  }
  return 'user';
}

export const ensureTrailingSlash = (url: string) => {
  if (url.endsWith('/')) {
    return url;
  }
  return `${url}/`;
}

export const getUserId = (decodedToken: any) => {
  const {iss, user} = decodedToken;
  return `${ensureTrailingSlash(iss ?? "")}${user ?? ""}`;
}

export const getUserInfo = (decodedToken: any) => {
  const {name = '', email = '', given_name = '', family_name = ''} = decodedToken.userInfo || {
    name: '',
    email: '',
    given_name: '',
    family_name: ''
  };
  return {name, email, given_name, family_name};
}

export const computeClassHash = (s: string) => {
  return createHash("sha256").update(s).digest("hex").slice(0, 48);
}

export const computeUidHash = (s: string) => {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

/*
{
  id: 75,
  iss: 'https://cc-lti-poc.moodiy.me',
  platformId: '30fc0b0380dadd24ea1833311dded806',
  clientId: '8n463FMy7nT7m0V',
  deploymentId: '6',
  user: '5',
  userInfo: {
    name: 'Admin User',
    email: 'dmartin@concord.org',
    given_name: 'Admin',
    family_name: 'User'
  },
  platformInfo: {
    guid: 'eca097ecc828fc522b1e8c68b1b7fb8b',
    name: 'cc-lti-poc',
    version: '2024100704.06',
    description: 'cc-lti-poc',
    product_family_code: 'moodle'
  },
  createdAt: '2025-06-26T08:51:29.000Z',
  updatedAt: '2025-06-26T08:51:29.000Z',
  platformContext: {
    roles: [
      'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
      'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator'
    ],
    id: 75,
    contextId: 'https%3A%2F%2Fcc-lti-poc.moodiy.me8n463FMy7nT7m0V63_30_6b44edb93b9ce5d45c8060dd846542851f61e9d3e9cefe0b908bd5f6a543320a',
    path: '/launch',
    user: '5',
    targetLinkUri: 'https://35c2-2601-19b-4300-bb70-6879-2531-3741-af2a.ngrok-free.app/launch',
    context: { id: '3', type: [Array], label: 'test', title: 'Test Course' },
    resource: { id: '30', title: 'AP Launch Demo', description: '' },
    custom: {
      key: 'value',
      slug: 'ap-launch-demo',
      custom1: 'value1',
      custom2: 'value2',
      context_memberships_url: 'https://cc-lti-poc.moodiy.me/mod/lti/services.php/CourseSection/3/bindings/6/memberships'
    },
    endpoint: {
      scope: [Array],
      lineitems: 'https://cc-lti-poc.moodiy.me/mod/lti/services.php/3/lineitems?type_id=6'
    },
    namesRoles: {
      service_versions: [Array],
      context_memberships_url: 'https://cc-lti-poc.moodiy.me/mod/lti/services.php/CourseSection/3/bindings/6/memberships'
    },
    lis: { person_sourcedid: '', course_section_sourcedid: '' },
    launchPresentation: {
      locale: 'en',
      return_url: 'https://cc-lti-poc.moodiy.me/mod/lti/return.php?course=3&launch_container=2&instanceid=30&sesskey=6FmRxDfGW1',
      document_target: 'iframe'
    },
    messageType: 'LtiResourceLinkRequest',
    version: '1.3.0',
    deepLinkingSettings: null,
    createdAt: '2025-06-26T08:51:29.000Z',
    updatedAt: '2025-06-26T08:51:29.000Z'
  },
  iat: 1750927889
}
*/