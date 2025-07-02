import fs from 'fs'
import path from "path"
import 'dotenv/config'

const requiredEnvVars = ['PUBLIC_URL', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'LOCAL_JWT_SECRET', 'LTI_KEY', 'AP_BASE_URL']
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

export let firebaseAppConfig: {clientEmail: string, privateKey: string}
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

export const localJWTAlg = 'HS256'

