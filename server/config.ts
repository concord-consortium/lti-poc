import fs from 'fs'
import path from "path"
import 'dotenv/config'

const requiredEnvVars = [
  'PUBLIC_URL',
  'DB_NAME',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_HOST',
  'DB_PORT',
  'LOCAL_JWT_SECRET',
  'LTI_KEY',
  'AP_BASE_URL',
]
const optionalEnvVars = [
  'LOG_REQUESTS',
  'LOG_REQUESTS_PATH',
  'DYNAMIC_REGISTRATION_NAME'
]
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
  process.exit(1)
}

export let publicUrl = process.env.PUBLIC_URL!
if (publicUrl.endsWith('/')) {
  publicUrl = publicUrl.slice(0, -1)
}

export const dbName = process.env.DB_NAME!
export const dbUsername = process.env.DB_USERNAME!
export const dbPassword = process.env.DB_PASSWORD!
export const dbHost = process.env.DB_HOST!
export const dbPort = process.env.DB_PORT!
export const localJWTSecret = process.env.LOCAL_JWT_SECRET!
export const ltiKey = process.env.LTI_KEY!
export const apBaseUrl = process.env.AP_BASE_URL!
export const clueBaseUrl = process.env.CLUE_BASE_URL!

export const logRequests = process.env.LOG_REQUESTS === 'true'
export const logRequestsPath = process.env.LOG_REQUESTS_PATH || '/tmp/requests.log'
export const dynamicRegistrationName = process.env.DYNAMIC_REGISTRATION_NAME || 'LTI POC'

export type FirebaseConfig = {
  clientEmail: string;
  privateKey: string;
}

const loadFirebaseConfig = (fileName: string): FirebaseConfig => {
  const configPath = path.join(__dirname, 'firebase-configs', fileName)
  try {
    const configContent = fs.readFileSync(configPath, 'utf8')
    const firebaseConfig = JSON.parse(configContent)
    if (!firebaseConfig.privateKey || typeof firebaseConfig.privateKey !== 'string' || !firebaseConfig.privateKey.trim()) {
      throw new Error(`Missing or empty "privateKey" in ${configPath}`)
    }
    if (!firebaseConfig.clientEmail || typeof firebaseConfig.clientEmail !== 'string' || !firebaseConfig.clientEmail.trim()) {
      throw new Error(`Missing or empty "clientEmail" in ${configPath}`)
    }
    return firebaseConfig
  } catch (err) {
    throw new Error(`Failed to load or parse ${configPath}: ${err.message}`)
  }
}

export const reportServiceDevConfig = loadFirebaseConfig('report-service-dev.json')
export const reportServiceProConfig = loadFirebaseConfig('report-service-pro.json')
export const tokenServiceConfig = loadFirebaseConfig('token-service.json')

export const localJWTAlg = 'HS256'

