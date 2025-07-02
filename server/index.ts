import { lti } from './lti'
import { addApiRoutes } from './api'
import { addPortalApiRoutes } from './portal-api'
import { getWhitelist } from './whitelist'

addApiRoutes(lti)
addPortalApiRoutes(lti)

const start = async () => {
  lti.whitelist(...getWhitelist())
  await lti.deploy({ port: 3000 })
}

start()
