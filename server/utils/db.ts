import mysql from 'mysql2/promise'

const config = useRuntimeConfig()

export const db = mysql.createPool({
  host: config.dbHost,
  user: config.dbUser,
  password: config.dbPass,
  database: config.dbName,
  waitForConnections: true,
  connectionLimit: 10
})