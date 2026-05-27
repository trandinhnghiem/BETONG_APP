const NotificationModel = require('../models/Notification')

class NotificationService {

  // ==============================
  // GỬI THÔNG BÁO CHO 1 USER CỤ THỂ
  // Ghi DB + emit socket event đến user
  // ==============================
  static async sendUserNotification(io, userId, type, title, message, relatedOrderId = null) {
    try {
      // 1. Ghi vào DB
      const result = await NotificationModel.create({
        receiverId: userId,
        notificationType: type,
        title,
        message,
        relatedOrderId
      })

      // 2. Emit socket đến user room
      // Frontend join room bằng: socket.emit('join_user', String(userId))
      // Server xử lý join room: socket.join(String(userId))
      // Nên emit đến room = String(userId)
      if (io) {
        io.to(String(userId)).emit('notification', {
          id: result.id,
          type,
          title,
          message,
          relatedOrderId,
          createdAt: new Date().toISOString()
        })
      }

      return result
    } catch (err) {
      console.error('NotificationService.sendUserNotification error:', err)
    }
  }

  // ==============================
  // GỬI THÔNG BÁO CHO TẤT CẢ USER THUỘC 1 ROLE
  // Ghi DB cho từng user + emit socket đến từng user room
  // ==============================
  static async notifyRoleUsers(io, role, type, title, message, relatedOrderId = null) {
    try {
      const { getConnection, sql } = require('../config/database')
      const pool = await getConnection()

      // Tìm tất cả user thuộc role này
      const users = await pool.request()
        .input('role', sql.NVarChar, role)
        .query('SELECT Id FROM Users WHERE Role = @role')

      const userIds = users.recordset.map(u => u.Id)

      // Gửi cho từng user
      for (const userId of userIds) {
        await this.sendUserNotification(io, userId, type, title, message, relatedOrderId)
      }

      // ✅ THÊM: Emit broadcast đến role room (cho user đang online)
      // Frontend join role room bằng: socket.emit('join_role', String(role))
      if (io) {
        io.to(String(role)).emit('notification', {
          type,
          title,
          message,
          relatedOrderId,
          createdAt: new Date().toISOString()
        })
      }

      return userIds.length
    } catch (err) {
      console.error('NotificationService.notifyRoleUsers error:', err)
    }
  }

  // ==============================
  // GỬI THÔNG BÁO CHO TẤT CẢ USER THUỘC 1 STATION
  // Ghi DB cho từng user + emit socket đến từng user room
  // ==============================
  static async notifyStationUsers(io, stationId, type, title, message, relatedOrderId = null) {
    try {
      const { getConnection, sql } = require('../config/database')
      const pool = await getConnection()

      // Tìm tất cả user thuộc station này
      const users = await pool.request()
        .input('stationId', sql.Int, stationId)
        .query('SELECT Id FROM Users WHERE StationId = @stationId')

      const userIds = users.recordset.map(u => u.Id)

      // Gửi cho từng user (ghi DB + emit socket)
      for (const userId of userIds) {
        await this.sendUserNotification(io, userId, type, title, message, relatedOrderId)
      }

      // ✅ THÊM: Emit broadcast đến station room
      // Frontend join station room bằng: socket.emit('join_station', String(stationId))
      if (io) {
        io.to(String(stationId)).emit('notification', {
          type,
          title,
          message,
          relatedOrderId,
          createdAt: new Date().toISOString()
        })
      }

      return userIds.length
    } catch (err) {
      console.error('NotificationService.notifyStationUsers error:', err)
    }
  }
}

module.exports = NotificationService
