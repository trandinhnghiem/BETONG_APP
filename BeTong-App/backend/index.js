const express = require('express')
const cors = require('cors')
const cron = require('node-cron')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

// Import routes
const authRoutes = require('./routes/authRoutes')
const orderRoutes = require('./routes/orderRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const userRoutes = require('./routes/userRoutes')

// Import database
const { getConnection } = require('./config/database')

// =======================
// ✅ CORS CONFIG (FIX)
// =======================
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3005' // 🔥 thêm frontend của bạn
      ],
  credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
  };

  try {
    const pool = await getConnection();
    await pool.request().query("SELECT 1");
    healthStatus.services.database = "connected";
  } catch (error) {
    healthStatus.status = "ERROR";
    healthStatus.services.database = "disconnected";
    return res.status(503).json(healthStatus);
  }

  res.json(healthStatus);
});

// =======================
// 404 + ERROR HANDLER
// =======================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// =======================
// INIT SERVICES
// =======================
async function seedDefaultUsers() {
  try {
    const UserModel = require('./models/User');
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
      },
      {
        username: 'station',
        email: 'station@auditapp.com',
        password: '123456',
        fullName: 'Station Operator',
        role: 'Station'
      }
    ];

    for (const user of defaultUsers) {
      const existing = await UserModel.findByUsername(user.username);
      if (!existing) {
        await UserModel.create({
          username: user.username,
          email: user.email,
          password: user.password,
          fullName: user.fullName,
          role: user.role
        });
        console.log(`✅ Default user created: ${user.username} (${user.role})`);
      }
    }
  } catch (error) {
    console.error('Error seeding default users:', error.message);
  }
}

async function initializeServices() {
  console.log("🔧 Initializing services...");

  try {
    await getConnection();
    console.log("✅ Database connected");

    await seedDefaultUsers();
  } catch (error) {
    console.error("❌ DB Error:", error.message);
  }

  if (!process.env.JWT_SECRET) {
    console.warn("⚠️ JWT_SECRET not set");
  } else {
    console.log("✅ JWT ready");
  }
}

// =======================
// START SERVER
// =======================
app.listen(PORT, async () => {
  console.log("=".repeat(50));
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("=".repeat(50));

  await initializeServices();

  console.log("✅ Ready!");
});

module.exports = app