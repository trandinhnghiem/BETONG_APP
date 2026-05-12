// Script to create test users
const { getConnection, sql } = require('../config/database');
const bcrypt = require('bcryptjs');

const testUsers = [
  {
    username: 'admin',
    password: 'Admin@123456',
    email: 'admin@auditapp.com',
    fullName: 'System Administrator',
    phone: '0901234567',
    role: 'Admin'
  },
  {
    username: 'accounting1',
    password: 'Acc@123456',
    email: 'accounting@auditapp.com',
    fullName: 'Accounting Officer',
    phone: '0902345678',
    role: 'Accounting'
  },
  {
    username: 'coor',
    password: '123456',
    email: 'coordinator@auditapp.com',
    fullName: 'Order Coordinator',
    phone: '0903456789',
    role: 'Coordinator'
  },
  {
    username: 'coordinator1',
    password: 'Coord@123456',
    email: 'coordinator1@auditapp.com',
    fullName: 'Order Coordinator',
    phone: '0903456789',
    role: 'Coordinator'
  },
  {
    username: 'station',
    password: '123456',
    email: 'station@auditapp.com',
    fullName: 'Station Operator',
    phone: '0904567890',
    role: 'Station'
  },
  {
    username: 'station1',
    password: 'Station@123456',
    email: 'station1@auditapp.com',
    fullName: 'Station Operator',
    phone: '0904567891',
    role: 'Station'
  }
];

async function createTestUsers() {
  const pool = await getConnection();
  
  console.log('\n📝 Creating test users...\n');
  
  for (const user of testUsers) {
    try {
      // Check if user already exists
      const existing = await pool
        .request()
        .input('username', sql.NVarChar, user.username)
        .query('SELECT Id FROM Users WHERE Username = @username');
      
      if (existing.recordset.length > 0) {
        console.log(`⏭️  User '${user.username}' already exists, skipping...`);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Create user
      const result = await pool
        .request()
        .input('username', sql.NVarChar, user.username)
        .input('email', sql.NVarChar, user.email)
        .input('passwordHash', sql.NVarChar, hashedPassword)
        .input('fullName', sql.NVarChar, user.fullName)
        .input('phone', sql.NVarChar, user.phone)
        .input('role', sql.NVarChar, user.role)
        .query(`
          INSERT INTO Users (Username, Email, PasswordHash, FullName, Phone, Role, IsActive)
          VALUES (@username, @email, @passwordHash, @fullName, @phone, @role, 1)
          SELECT SCOPE_IDENTITY() as id
        `);
      
      console.log(`✅ Created user: ${user.username} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error creating user '${user.username}':`, error.message);
    }
  }
  
  console.log('\n✅ User creation completed!\n');
  console.log('📋 Test accounts created:');
  testUsers.forEach(user => {
    console.log(`   - Username: ${user.username} | Password: ${user.password} | Role: ${user.role}`);
  });
  console.log('');
  
  process.exit(0);
}

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
createTestUsers().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
