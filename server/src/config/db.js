const sql = require('mssql')

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    useUTC: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

const pool = new sql.ConnectionPool(config)
const poolConnect = pool.connect()

pool.on('error', (err) => {
  console.error('Database connection error:', err)
})

const getPool = async () => {
  await poolConnect
  return pool
}

module.exports = { sql, getPool }