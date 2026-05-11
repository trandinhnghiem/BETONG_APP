const sql = require('mssql')
require('dotenv').config()

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourPassword123',
  database: process.env.DB_NAME || 'AuditAppDB',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0
  }
}

let connectionPool = null

async function getConnection() {
  try {
    if (connectionPool) {
      return connectionPool
    }
    
    connectionPool = new sql.ConnectionPool(config)
    await connectionPool.connect()
    console.log('✅ Database connected successfully')
    return connectionPool
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    throw error
  }
}

async function closeConnection() {
  if (connectionPool) {
    await connectionPool.close()
    connectionPool = null
  }
}

module.exports = {
  getConnection,
  closeConnection,
  sql
}