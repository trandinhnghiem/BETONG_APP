const { getConnection, sql } = require('../config/database')

class Station {
  static async findAll(limit = 100, offset = 0) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT Id, StationCode, StationName, Address, Phone, Manager, Status
        FROM Stations
        WHERE Status = 'Active'
        ORDER BY StationName
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `)
    return result.recordset
  }

  static async findById(id) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT Id, StationCode, StationName, Address, Phone, Manager, Status
        FROM Stations
        WHERE Id = @id
      `)
    return result.recordset[0]
  }

  static async create(stationData) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('stationCode', sql.NVarChar, stationData.stationCode)
      .input('stationName', sql.NVarChar, stationData.stationName)
      .input('address', sql.NVarChar, stationData.address || null)
      .input('phone', sql.NVarChar, stationData.phone || null)
      .input('manager', sql.NVarChar, stationData.manager || null)
      .input('status', sql.NVarChar, stationData.status || 'Active')
      .query(`
        INSERT INTO Stations (StationCode, StationName, Address, Phone, Manager, Status)
        OUTPUT INSERTED.Id
        VALUES (@stationCode, @stationName, @address, @phone, @manager, @status)
      `)
    return result.recordset[0]
  }

  static async update(id, stationData) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('stationName', sql.NVarChar, stationData.stationName)
      .input('address', sql.NVarChar, stationData.address)
      .input('phone', sql.NVarChar, stationData.phone)
      .input('manager', sql.NVarChar, stationData.manager)
      .input('status', sql.NVarChar, stationData.status)
      .query(`
        UPDATE Stations
        SET StationName = @stationName, Address = @address, Phone = @phone,
            Manager = @manager, Status = @status, UpdatedAt = GETDATE()
        WHERE Id = @id
      `)
    return result.rowsAffected[0] > 0
  }
}

module.exports = Station