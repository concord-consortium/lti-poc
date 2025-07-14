import { dbHost, dbName, dbPassword, dbPort, dbUsername } from "./config"

const Database = require('ltijs-sequelize')

export const db = new Database(dbName, dbUsername, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mariadb', // needed so that the JSON type parses the string
  logging: false
})
