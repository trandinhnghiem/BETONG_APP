const { getConnection, sql } = require('../config/database')

class Order {
  static async create(orderData) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('orderCode', sql.NVarChar, orderData.orderCode)
      .input('coordinatorId', sql.Int, orderData.coordinatorId)
      .input('sourceStationId', sql.Int, orderData.sourceStationId)
      .input('destinationStationId', sql.Int, orderData.destinationStationId)
      .input('totalAmount', sql.Decimal(18, 2), orderData.totalAmount)
      .input('notes', sql.NVarChar, orderData.notes || null)
      .query(`
        INSERT INTO Orders (OrderCode, CoordinatorId, SourceStationId, DestinationStationId, TotalAmount, Notes)
        OUTPUT INSERTED.Id
        VALUES (@orderCode, @coordinatorId, @sourceStationId, @destinationStationId, @totalAmount, @notes)
      `)
    return { id: result.recordset[0].Id }
  }

  static async findById(id) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT o.*, u.FullName as CoordinatorName, s1.StationName as SourceStation, s2.StationName as DestinationStation
        FROM Orders o
        JOIN Users u ON o.CoordinatorId = u.Id
        JOIN Stations s1 ON o.SourceStationId = s1.Id
        JOIN Stations s2 ON o.DestinationStationId = s2.Id
        WHERE o.Id = @id
      `)
    return result.recordset[0]
  }

  static async findByCoordinator(coordinatorId, limit = 50, offset = 0) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('coordinatorId', sql.Int, coordinatorId)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT o.*, s1.StationName as SourceStation, s2.StationName as DestinationStation
        FROM Orders o
        JOIN Stations s1 ON o.SourceStationId = s1.Id
        JOIN Stations s2 ON o.DestinationStationId = s2.Id
        WHERE o.CoordinatorId = @coordinatorId
        ORDER BY o.CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `)
    return result.recordset
  }

  static async findPendingApproval(limit = 50, offset = 0) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT o.*, u.FullName as CoordinatorName, s1.StationName as SourceStation, s2.StationName as DestinationStation
        FROM Orders o
        JOIN Users u ON o.CoordinatorId = u.Id
        JOIN Stations s1 ON o.SourceStationId = s1.Id
        JOIN Stations s2 ON o.DestinationStationId = s2.Id
        WHERE o.OrderStatus = 'Pending Approval'
        ORDER BY o.CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `)
    return result.recordset
  }

  static async findAll(limit = 50, offset = 0) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT o.*, u.FullName as CoordinatorName, s1.StationName as SourceStation, s2.StationName as DestinationStation
        FROM Orders o
        JOIN Users u ON o.CoordinatorId = u.Id
        JOIN Stations s1 ON o.SourceStationId = s1.Id
        JOIN Stations s2 ON o.DestinationStationId = s2.Id
        ORDER BY o.CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `)
    return result.recordset
  }

  static async approve(orderId, accountingId, approvalReason = null) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('orderId', sql.Int, orderId)
      .input('accountingId', sql.Int, accountingId)
      .input('approvalReason', sql.NVarChar, approvalReason)
      .query(`
        UPDATE Orders
        SET OrderStatus = 'Approved', ApprovedBy = @accountingId, ApprovedAt = GETDATE(), ApprovalReason = @approvalReason, UpdatedAt = GETDATE()
        WHERE Id = @orderId AND OrderStatus = 'Pending Approval'
      `)
    return result.rowsAffected[0] > 0
  }

  static async reject(orderId, accountingId, rejectionReason) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('orderId', sql.Int, orderId)
      .input('accountingId', sql.Int, accountingId)
      .input('rejectionReason', sql.NVarChar, rejectionReason)
      .query(`
        UPDATE Orders
        SET OrderStatus = 'Rejected', ApprovedBy = @accountingId, RejectionReason = @rejectionReason, UpdatedAt = GETDATE()
        WHERE Id = @orderId AND OrderStatus = 'Pending Approval'
      `)
    return result.rowsAffected[0] > 0
  }

  static async updateStatus(orderId, status, userId = null) {
    const pool = await getConnection()
    let query = 'UPDATE Orders SET OrderStatus = @status, UpdatedAt = GETDATE()'
    const request = pool.request()
      .input('orderId', sql.Int, orderId)
      .input('status', sql.NVarChar, status)

    if (status === 'Uploading' && userId) {
      query += ', UploadedAt = GETDATE()'
    } else if (status === 'Sent' && userId) {
      query += ', SentToStationAt = GETDATE()'
    } else if (status === 'Delivered' && userId) {
      query += ', StationReceivedAt = GETDATE()'
    }

    query += ' WHERE Id = @orderId'

    const result = await request.query(query)
    return result.rowsAffected[0] > 0
  }

  static async confirmPayment(orderId, accountingId, paymentMethod = null) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('orderId', sql.Int, orderId)
      .input('accountingId', sql.Int, accountingId)
      .input('paymentMethod', sql.NVarChar, paymentMethod)
      .query(`
        UPDATE Orders
        SET PaymentStatus = 'Confirmed', PaymentConfirmedBy = @accountingId, PaymentConfirmedAt = GETDATE(), PaymentMethod = @paymentMethod, UpdatedAt = GETDATE()
        WHERE Id = @orderId
      `)
    return result.rowsAffected[0] > 0
  }
}

module.exports = Order