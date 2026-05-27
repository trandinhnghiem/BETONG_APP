const { getConnection, sql } = require('../config/database')

class NotificationModel {

  // Tìm theo ID
  static async findById(id) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Notifications WHERE Id = @id')
    return result.recordset[0]
  }

  // ✅ Lấy danh sách notification theo ReceiverId (theo User)
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

  // ✅ Đếm số notification chưa đọc theo ReceiverId
  static async countUnread(receiverId) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('receiverId', sql.Int, receiverId)
      .query(`
        SELECT COUNT(*) AS total
        FROM Notifications
        WHERE ReceiverId = @receiverId AND IsRead = 0
      `)
    return result.recordset[0].total
  }

  // ✅ Tạo notification mới - dùng ReceiverId (bắt buộc)
  static async create(notificationData) {
    const pool = await getConnection()

    const result = await pool
      .request()
      .input('receiverId', sql.Int, notificationData.receiverId)
      .input('notificationType', sql.NVarChar, notificationData.notificationType || 'SYSTEM')
      .input('title', sql.NVarChar, notificationData.title || '')
      .input('message', sql.NVarChar(sql.MAX), notificationData.message || '')
      .input('relatedOrderId', sql.Int, notificationData.relatedOrderId || null)
      .query(`
        INSERT INTO Notifications (ReceiverId, NotificationType, Title, Message, RelatedOrderId, IsRead, CreatedAt)
        VALUES (@receiverId, @notificationType, @title, @message, @relatedOrderId, 0, GETDATE())
        SELECT SCOPE_IDENTITY() as id
      `)
    return result.recordset[0]
  }

  // ✅ Đánh dấu 1 notification đã đọc - kiểm tra thuộc về user
  static async markAsRead(id, receiverId) {
    const pool = await getConnection()

    const request = pool
      .request()
      .input('id', sql.Int, id)

    // Nếu có receiverId → chỉ update nếu notification thuộc user đó
    if (receiverId) {
      request.input('receiverId', sql.Int, receiverId)
      const result = await request.query(`
        UPDATE Notifications
        SET IsRead = 1, ReadAt = GETDATE()
        WHERE Id = @id AND ReceiverId = @receiverId
      `)
      return result.rowsAffected[0] > 0
    }

    // Fallback (không kiểm tra quyền - chỉ dùng cho admin)
    const result = await request.query(`
      UPDATE Notifications
      SET IsRead = 1, ReadAt = GETDATE()
      WHERE Id = @id
    `)
    return result.rowsAffected[0] > 0
  }

  // ✅ Đánh dấu tất cả đã đọc theo ReceiverId
  static async markAllAsRead(receiverId) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('receiverId', sql.Int, receiverId)
      .query(`
        UPDATE Notifications
        SET IsRead = 1, ReadAt = GETDATE()
        WHERE ReceiverId = @receiverId AND IsRead = 0
      `)
    return result.rowsAffected[0]
  }

  // ✅ Xóa notification - kiểm tra thuộc về user
  static async delete(id, receiverId) {
    const pool = await getConnection()
    const request = pool
      .request()
      .input('id', sql.Int, id)

    if (receiverId) {
      request.input('receiverId', sql.Int, receiverId)
      const result = await request.query(`
        DELETE FROM Notifications
        WHERE Id = @id AND ReceiverId = @receiverId
      `)
      return result.rowsAffected[0] > 0
    }

    const result = await request.query(`
      DELETE FROM Notifications WHERE Id = @id
    `)
    return result.rowsAffected[0] > 0
  }
}

module.exports = NotificationModel
