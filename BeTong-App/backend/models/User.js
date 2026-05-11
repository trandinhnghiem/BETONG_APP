const { getConnection, sql } = require('../config/database')
const bcrypt = require('bcryptjs')

class UserModel {
  static async findByUsername(username) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE Username = @username')
    return result.recordset[0]
  }

  static async findById(id) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT Id, Username, Email, FullName, Phone, Role, IsActive, CreatedAt FROM Users WHERE Id = @id')
    return result.recordset[0]
  }

  static async findAll(limit = 100, offset = 0) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT Id, Username, Email, FullName, Phone, Role, IsActive, CreatedAt, UpdatedAt
        FROM Users
        ORDER BY CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `)
    return result.recordset
  }

  static async create(userData) {
    const pool = await getConnection()
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    const result = await pool
      .request()
      .input('username', sql.NVarChar, userData.username)
      .input('email', sql.NVarChar, userData.email)
      .input('passwordHash', sql.NVarChar, hashedPassword)
      .input('fullName', sql.NVarChar, userData.fullName)
      .input('phone', sql.NVarChar, userData.phone || null)
      .input('role', sql.NVarChar, userData.role || 'Coordinator')
      .query(`
        INSERT INTO Users (Username, Email, PasswordHash, FullName, Phone, Role)
        VALUES (@username, @email, @passwordHash, @fullName, @phone, @role)
        SELECT SCOPE_IDENTITY() as id
      `)
    return result.recordset[0]
  }

  static async update(id, userData) {
    const pool = await getConnection()
    
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('fullName', sql.NVarChar, userData.fullName)
      .input('phone', sql.NVarChar, userData.phone)
      .input('role', sql.NVarChar, userData.role)
      .input('isActive', sql.Bit, userData.isActive !== undefined ? userData.isActive : 1)
      .query(`
        UPDATE Users
        SET FullName = @fullName, Phone = @phone, Role = @role, IsActive = @isActive, UpdatedAt = GETDATE()
        WHERE Id = @id
      `)
    return result.rowsAffected[0] > 0
  }

  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash)
  }
}

module.exports = UserModel

