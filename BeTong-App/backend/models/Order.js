const { getConnection, sql } = require('../config/database')

class OrderModel {

  // ================= GET ORDERS BY COORDINATOR =================
  static async findByCoordinator(coordinatorId, limit = 50, offset = 0) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('CoordinatorId', sql.Int, coordinatorId)
      .input('Limit', sql.Int, limit)
      .input('Offset', sql.Int, offset)
      .query(`
        SELECT 
          o.Id,
          o.OrderCode,

          -- ✅ FIX: dùng StationName
          s1.StationName AS SourceStation,
          s2.StationName AS DestinationStation,

          -- nếu chưa có TotalAmount thì dùng Volume * Price
          ISNULL(o.TotalAmount, o.Volume * o.Price) AS TotalAmount,

          o.OrderStatus,
          o.CreatedAt

        FROM Orders o

        LEFT JOIN Stations s1 ON o.SourceStationId = s1.Id
        LEFT JOIN Stations s2 ON o.DestinationStationId = s2.Id

        WHERE o.CoordinatorId = @CoordinatorId

        ORDER BY o.CreatedAt DESC
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
      `)

    return result.recordset
  }

  // ================= GET ALL ORDERS =================
  static async findAll(limit = 50, offset = 0) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('Limit', sql.Int, limit)
      .input('Offset', sql.Int, offset)
      .query(`
        SELECT 
          o.Id,
          o.OrderCode,
          s1.StationName AS SourceStation,
          s2.StationName AS DestinationStation,
          ISNULL(o.TotalAmount, o.Volume * o.Price) AS TotalAmount,
          o.OrderStatus,
          o.CreatedAt

        FROM Orders o
        LEFT JOIN Stations s1 ON o.SourceStationId = s1.Id
        LEFT JOIN Stations s2 ON o.DestinationStationId = s2.Id

        ORDER BY o.CreatedAt DESC
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
      `)

    return result.recordset
  }

  // ================= GET ORDER BY ID =================
  static async findById(orderId) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .query(`
        SELECT 
          o.*,
          s1.StationName AS SourceStation,
          s2.StationName AS DestinationStation

        FROM Orders o
        LEFT JOIN Stations s1 ON o.SourceStationId = s1.Id
        LEFT JOIN Stations s2 ON o.DestinationStationId = s2.Id

        WHERE o.Id = @OrderId
      `)

    return result.recordset[0]
  }

  // ================= UPDATE STATUS =================
  static async updateStatus(orderId, status, userId) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('Status', sql.NVarChar, status)
      .input('UserId', sql.Int, userId)
      .query(`
        UPDATE Orders
        SET 
          OrderStatus = @Status,
          UpdatedAt = GETDATE()
        WHERE Id = @OrderId
      `)

    return result.rowsAffected[0] > 0
  }

  // ================= PENDING APPROVAL =================
  static async findPendingApproval(limit = 50, offset = 0) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('Limit', sql.Int, limit)
      .input('Offset', sql.Int, offset)
      .query(`
        SELECT 
          o.Id,
          o.OrderCode,
          s1.StationName AS SourceStation,
          s2.StationName AS DestinationStation,
          ISNULL(o.TotalAmount, o.Volume * o.Price) AS TotalAmount,
          o.OrderStatus,
          o.CreatedAt

        FROM Orders o
        LEFT JOIN Stations s1 ON o.SourceStationId = s1.Id
        LEFT JOIN Stations s2 ON o.DestinationStationId = s2.Id

        WHERE o.OrderStatus = 'Pending Approval'

        ORDER BY o.CreatedAt DESC
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
      `)

    return result.recordset
  }

  static async findByStation(stationId) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('StationId', stationId)
      .query(`
        SELECT 
          o.*,
          u.FullName AS CoordinatorName,
          s2.StationName AS DestinationStation
        FROM Orders o
        LEFT JOIN Users u ON o.CoordinatorId = u.Id
        LEFT JOIN Stations s2 ON o.DestinationStationId = s2.Id
        WHERE o.DestinationStationId = @StationId
        ORDER BY o.CreatedAt DESC
      `)

    return result.recordset
  }

}

module.exports = OrderModel