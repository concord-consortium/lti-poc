import { dbHost, dbName, dbPassword, dbPort, dbUsername } from "./config"

const Database = require('ltijs-sequelize')

export const db = new Database(dbName, dbUsername, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false
})
