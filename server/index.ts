import { lti, postDeployment } from './lti'
import { addApiRoutes } from './api'
import { addPortalApiRoutes } from './portal-api'
import { getWhitelist } from './whitelist'
import { addCodapRoutes } from './codap/codap-api'

addApiRoutes(lti)
addPortalApiRoutes(lti)
addCodapRoutes(lti)

const start = async () => {
  lti.whitelist(...getWhitelist())

  await lti.deploy({ port: 3000 })

  postDeployment()
}

start()
