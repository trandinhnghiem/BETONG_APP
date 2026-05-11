const { getConnection, sql } = require('../config/database')

class NotificationModel {
  static async findById(id) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Notifications WHERE Id = @id')
    return result.recordset[0]
  }

  static async findByReceiver(receiverId, limit = 50, offset = 0) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('receiverId', sql.Int, receiverId)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT *
        FROM Notifications
        WHERE ReceiverId = @receiverId
        ORDER BY CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `)
    return result.recordset
  }

  static async findUnread(receiverId, limit = 50) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('receiverId', sql.Int, receiverId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) *
        FROM Notifications
        WHERE ReceiverId = @receiverId AND IsRead = 0
        ORDER BY CreatedAt DESC
      `)
    return result.recordset
  }

  static async create(notificationData) {
    const pool = await getConnection()
    
    const result = await pool
      .request()
      .input('receiverId', sql.Int, notificationData.receiverId)
      .input('notificationType', sql.NVarChar, notificationData.notificationType)
      .input('title', sql.NVarChar, notificationData.title)
      .input('message', sql.NVarChar, notificationData.message)
      .input('relatedOrderId', sql.Int, notificationData.relatedOrderId || null)
      .query(`
        INSERT INTO Notifications (ReceiverId, NotificationType, Title, Message, RelatedOrderId)
        VALUES (@receiverId, @notificationType, @title, @message, @relatedOrderId)
        SELECT SCOPE_IDENTITY() as id
      `)
    return result.recordset[0]
  }

  static async markAsRead(id) {
    const pool = await getConnection()
    
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Notifications
        SET IsRead = 1, ReadAt = GETDATE()
        WHERE Id = @id
      `)
    return result.rowsAffected[0] > 0
  }

  static async markMultipleAsRead(ids) {
    const pool = await getConnection()
    
    const result = await pool
      .request()
      .input('ids', sql.NVarChar, ids.join(','))
      .query(`
        UPDATE Notifications
        SET IsRead = 1, ReadAt = GETDATE()
        WHERE Id IN (${ids.join(',')})
      `)
    return result.rowsAffected[0]
  }
}

module.exports = NotificationModel
