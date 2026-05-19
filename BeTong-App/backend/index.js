const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const cron = require('node-cron')
require('dotenv').config()

const app = express()
const server = http.createServer(app)

const PORT = process.env.PORT || 5000

// =======================
// SOCKET IO
// =======================
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3005'
    ],
    credentials: true
  }
})

// =======================
// SOCKET CONNECTION
// =======================
io.on('connection', (socket) => {

  console.log('✅ Client connected:', socket.id)

  socket.on('join_station', (stationId) => {

    socket.join(`station_${stationId}`)

    console.log(`✅ Joined room station_${stationId}`)

  })

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected')
  })

})

// Import routes
const authRoutes = require('./routes/authRoutes')
const orderRoutes = require('./routes/orderRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const userRoutes = require('./routes/userRoutes')

// Import database
const { getConnection } = require('./config/database')

// =======================
// CORS CONFIG
// =======================
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3005'
      ],
  credentials: true,
}

app.use(cors(corsOptions))

app.use(express.json())

app.use(express.urlencoded({ extended: true }))

// =======================
// SHARE IO
// =======================
app.set('io', io)

// =======================
// ROUTES
// =======================
app.use('/api/auth', authRoutes)

app.use('/api/orders', orderRoutes)

app.use('/api/notifications', notificationRoutes)

app.use('/api/users', userRoutes)

// =======================
// HEALTH CHECK
// =======================
app.get('/health', (req, res) => {

  res.json({
    status: 'OK',
    message: 'Audit App Backend is running',
    timestamp: new Date().toISOString(),
  })

})

app.get('/api/health', async (req, res) => {

  const healthStatus = {
    status: "OK",
    services: {
      database: "unknown"
    }
  }

  try {

    const pool = await getConnection()

    await pool.request().query("SELECT 1")

    healthStatus.services.database = "connected"

  } catch (error) {

    healthStatus.status = "ERROR"

    healthStatus.services.database = "disconnected"

    return res.status(503).json(healthStatus)

  }

  res.json(healthStatus)

})

// =======================
// 404 + ERROR HANDLER
// =======================
app.use((req, res) => {

  res.status(404).json({
    error: 'Route not found'
  })

})

app.use((err, req, res, next) => {

  console.error(err.stack)

  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : undefined,
  })

})

// =======================
// INIT SERVICES
// =======================
async function ensureUserStationColumn() {

  try {

    const pool = await getConnection()

    const result = await pool.request().query(`
      SELECT 1
      FROM sys.columns
      WHERE object_id = OBJECT_ID('Users')
      AND name = 'StationId'
    `)

    if (result.recordset.length === 0) {

      await pool.request().query(`
        ALTER TABLE Users
        ADD StationId INT NULL
      `)

      console.log(
        '✅ Added StationId column to Users table'
      )

    }

  } catch (error) {

    console.error(
      'Error ensuring StationId column:',
      error.message
    )

  }

}

// =======================
// SEED STATIONS
// =======================
async function seedStations() {

  try {

    const StationModel = require('./models/Station')

    const stationDefinitions = [
      {
        stationCode: 'OMON1',
        stationName: 'Trạm Ô Môn 1',
        address: 'Ô Môn, Cần Thơ',
        phone: '0900000001'
      },
      {
        stationCode: 'OMON2',
        stationName: 'Trạm Ô Môn 2',
        address: 'Ô Môn, Cần Thơ',
        phone: '0900000002'
      },
      {
        stationCode: 'T82',
        stationName: 'Trạm T82',
        address: 'Tây Đô',
        phone: '0900000003'
      },
      {
        stationCode: 'HAUGIANG',
        stationName: 'Trạm Hậu Giang',
        address: 'Hậu Giang',
        phone: '0900000004'
      }
    ]

    const stations = {}

    for (const data of stationDefinitions) {

      let station =
        await StationModel.findByCode(data.stationCode)

      if (!station) {

        station = await StationModel.create(data)

        console.log(
          `✅ Created station: ${data.stationName}`
        )

      }

      stations[data.stationCode] = station

    }

    return stations

  } catch (error) {

    console.error(
      'Error seeding stations:',
      error.message
    )

    return {}

  }

}

// =======================
// SEED USERS
// =======================
async function seedDefaultUsers(stationMap) {

  try {

    const UserModel = require('./models/User')

    const defaultUsers = [
      {
        username: 'admin',
        email: 'admin@auditapp.com',
        password: 'Admin@123456',
        fullName: 'System Admin',
        role: 'Admin'
      },
      {
        username: 'coor',
        email: 'coordinator@auditapp.com',
        password: '123456',
        fullName: 'Order Coordinator',
        role: 'Coordinator'
      }
    ]

    const stationUsers = [
      {
        username: 'omon1',
        email: 'omon1@auditapp.com',
        password: 'Station@123',
        fullName: 'Trạm Ô Môn 1',
        role: 'Station',
        stationCode: 'OMON1'
      },
      {
        username: 'omon2',
        email: 'omon2@auditapp.com',
        password: 'Station@123',
        fullName: 'Trạm Ô Môn 2',
        role: 'Station',
        stationCode: 'OMON2'
      },
      {
        username: 't82',
        email: 't82@auditapp.com',
        password: 'Station@123',
        fullName: 'Trạm T82',
        role: 'Station',
        stationCode: 'T82'
      },
      {
        username: 'haugiang',
        email: 'haugiang@auditapp.com',
        password: 'Station@123',
        fullName: 'Trạm Hậu Giang',
        role: 'Station',
        stationCode: 'HAUGIANG'
      }
    ]

    for (const user of defaultUsers) {

      const existing =
        await UserModel.findByUsername(user.username)

      if (!existing) {

        await UserModel.create({
          username: user.username,
          email: user.email,
          password: user.password,
          fullName: user.fullName,
          role: user.role
        })

        console.log(
          `✅ Default user created:
          ${user.username} (${user.role})`
        )

      }

    }

    for (const user of stationUsers) {

      const station = stationMap[user.stationCode]

      if (!station) continue

      const existing =
        await UserModel.findByUsername(user.username)

      if (!existing) {

        await UserModel.create({
          username: user.username,
          email: user.email,
          password: user.password,
          fullName: user.fullName,
          role: user.role,
          stationId: station.Id
        })

        console.log(
          `✅ Station user created:
          ${user.username}`
        )

      } else if (!existing.StationId) {

        await UserModel.updateStationId(
          existing.Id,
          station.Id
        )

        console.log(
          `✅ Updated station assignment:
          ${user.username}`
        )

      }

    }

  } catch (error) {

    console.error(
      'Error seeding default users:',
      error.message
    )

  }

}

// =======================
// INIT
// =======================
async function initializeServices() {

  console.log("🔧 Initializing services...")

  try {

    await getConnection()

    console.log("✅ Database connected")

    await ensureUserStationColumn()

    const stationMap = await seedStations()

    await seedDefaultUsers(stationMap)

  } catch (error) {

    console.error("❌ DB Error:", error.message)

  }

  if (!process.env.JWT_SECRET) {

    console.warn("⚠️ JWT_SECRET not set")

  } else {

    console.log("✅ JWT ready")

  }

}

// =======================
// START SERVER
// =======================
server.listen(PORT, async () => {

  console.log("=".repeat(50))

  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  )

  console.log("=".repeat(50))

  await initializeServices()

  console.log("✅ Ready!")

})

module.exports = {
  app,
  io
}