import path from 'path'

// the ltijs types are old and not compatible with the latest version of ltijs
// import {Provider as lti} from 'ltijs'

const lti = require('ltijs').Provider
const Database = require('ltijs-sequelize')

const localTunnelUrl = process.env.LOCAL_TUNNEL_URL
if (!localTunnelUrl) {
  console.error('LOCAL_TUNNEL_URL environment variable is not set. Run localtunnel to expose this server to the internet.')
  process.exit(1)
}

const db = new Database('devdb', 'devuser', 'devpass', {
  host: 'localhost',
  port: 33306,
  dialect: 'mysql',
  logging: false
})

lti.setup('LTIKEY', // Key used to sign cookies and tokens
  {
    plugin: db
  },
  {
    appRoute: '/',
    loginRoute: '/login',
    cookies: {
      secure: false,
      sameSite: ''
    },
    devMode: true,
    dynRegRoute: '/register', // Setting up dynamic registration route. Defaults to '/register'
    dynReg: {
      url: localTunnelUrl, // Tool Provider URL. Required field.
      name: 'LTI POC', // Tool Provider name. Required field.
      logo: 'http://tool.example.com/assets/logo.svg', // Tool Provider logo URL.
      description: 'LTI Proof-of-concept', // Tool Provider description.
      redirectUris: [`${localTunnelUrl}/launch`], // Additional redirection URLs. The main URL is added by default.
      customParameters: { key: 'value' }, // Custom parameters.
      autoActivate: true // Whether or not dynamically registered Platforms should be automatically activated. Defaults to false.
    }
  }
)

lti.onConnect((token, req, res) => {
  return res.send(`<div style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify(token, null, 2)}</div>`)
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

lti.app.post('/deeplink', async (req, res) => {
  const resource = req.body

  const items = [
    {
      type: 'ltiResourceLink',
      title: resource.title,
      custom: {
        slug: resource.slug
      }
    }
  ]

  // Creates the deep linking request form
  const form = await lti.DeepLinking.createDeepLinkingForm(res.locals.token, items, { message: 'Successfully registered resource!' })

  return res.send(form)
})

const setup = async () => {
  await lti.deploy({ port: 3000 })
}

setup()
