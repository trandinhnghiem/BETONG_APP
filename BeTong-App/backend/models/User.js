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
      .query('SELECT Id, Username, Email, FullName, Phone, Role, StationId, IsActive, CreatedAt, UpdatedAt FROM Users WHERE Id = @id')
    return result.recordset[0]
  }

  static async findAll(limit = 100, offset = 0) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT Id, Username, Email, FullName, Phone, Role, StationId, IsActive, CreatedAt, UpdatedAt
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
      .input('stationId', sql.Int, userData.stationId || null)
      .query(`
        INSERT INTO Users (Username, Email, PasswordHash, FullName, Phone, Role, StationId)
        VALUES (@username, @email, @passwordHash, @fullName, @phone, @role, @stationId)
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
      .input('stationId', sql.Int, userData.stationId || null)
      .input('isActive', sql.Bit, userData.isActive !== undefined ? userData.isActive : 1)
      .query(`
        UPDATE Users
        SET FullName = @fullName, Phone = @phone, Role = @role, StationId = @stationId, IsActive = @isActive, UpdatedAt = GETDATE()
        WHERE Id = @id
      `)
    return result.rowsAffected[0] > 0
  }

  static async updateStationId(id, stationId) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('stationId', sql.Int, stationId)
      .query(`
        UPDATE Users
        SET StationId = @stationId, UpdatedAt = GETDATE()
        WHERE Id = @id
      `)
    return result.rowsAffected[0] > 0
  }

  static async findByRole(role) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('role', sql.NVarChar, role)
      .query(`
        SELECT Id, Username, Email, FullName, Phone, Role, StationId, IsActive
        FROM Users
        WHERE Role = @role AND IsActive = 1
      `)
    return result.recordset
  }

  static async findByStationId(stationId) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('stationId', sql.Int, stationId)
      .query(`
        SELECT Id, Username, Email, FullName, Phone, Role, StationId, IsActive
        FROM Users
        WHERE StationId = @stationId AND IsActive = 1
      `)
    return result.recordset
  }

  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash)
  }
}

module.exports = UserModel

