const { getConnection, sql } = require('../config/database')
const NotificationModel = require('../models/Notification')

class NotificationController {

  // ==============================
  // GET NOTIFICATIONS (theo ReceiverId = req.user.Id)
  // ==============================
  static async getAll(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50
      const offset = parseInt(req.query.offset) || 0

      const notifications = await NotificationModel.findByReceiver(
        req.user.Id,
        limit,
        offset
      )

      res.json(notifications)

    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  // ==============================
  // UNREAD COUNT (theo ReceiverId)
  // ==============================
  static async getUnreadCount(req, res) {
    try {
      const total = await NotificationModel.countUnread(req.user.Id)
      res.json({ total })

    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  // ==============================
  // MARK SINGLE READ (kiểm tra quyền)
  // ==============================
  static async markAsRead(req, res) {
    try {
      const id = parseInt(req.params.id)
      if (!id) {
        return res.status(400).json({ error: 'Invalid notification id' })
      }

      const updated = await NotificationModel.markAsRead(id, req.user.Id)

      if (!updated) {
        return res.status(404).json({ error: 'Notification not found or not yours' })
      }

      res.json({ success: true })

    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  // ==============================
  // MARK ALL READ (theo ReceiverId)
  // ==============================
  static async markAllRead(req, res) {
    try {
      const count = await NotificationModel.markAllAsRead(req.user.Id)
      res.json({ success: true, markedCount: count })

    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  // ==============================
  // DELETE SINGLE (kiểm tra quyền)
  // ==============================
  static async deleteNotification(req, res) {
    try {
      const id = parseInt(req.params.id)
      if (!id) {
        return res.status(400).json({ error: 'Invalid notification id' })
      }

      const deleted = await NotificationModel.delete(id, req.user.Id)

      if (!deleted) {
        return res.status(404).json({ error: 'Notification not found or not yours' })
      }

      res.json({ success: true })

    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }
}

module.exports = NotificationController
