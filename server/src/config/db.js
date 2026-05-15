const sql = require('mssql')

const toBool = (value, fallback = false) => {
  if (value === undefined) return fallback
  return String(value).toLowerCase() === 'true'
}

const parseDbServer = (value = '') => {
  const [server, instanceName] = value.split('\\')
  return {
    server: server || 'localhost',
    instanceName,
  }
}

const { server, instanceName } = parseDbServer(process.env.DB_SERVER)
const port = parseInt(process.env.DB_PORT, 10)

const config = {
  server,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  },
  options: {
    encrypt: toBool(process.env.DB_ENCRYPT, true),
    trustServerCertificate: toBool(process.env.DB_TRUST_SERVER_CERTIFICATE, false),
    useUTC: false,
    connectTimeout: 30000,
    requestTimeout: 30000,
    ...(instanceName ? { instanceName } : {}),
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
}

if (!instanceName) {
  config.port = Number.isNaN(port) ? 1433 : port
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
