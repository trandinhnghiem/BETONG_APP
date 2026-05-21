const { getConnection, sql } = require('../config/database')

class NotificationController {

  // ==============================
  // CREATE NOTIFICATION
  // ==============================
  static async create(req, res) {
    try {

      const {
        stationId,
        title,
        message,
        type,
        relatedOrderId
      } = req.body

      if (!stationId) {
        return res.status(400).json({
          error: 'StationId is required'
        })
      }

      const pool = await getConnection()

      await pool.request()
        .input('StationId', sql.Int, stationId)
        .input('NotificationType', sql.NVarChar, type || 'SYSTEM')
        .input('Title', sql.NVarChar, title || '')
        .input('Message', sql.NVarChar(sql.MAX), message || '')
        .input('RelatedOrderId', sql.Int, relatedOrderId || null)
        .query(`
          INSERT INTO Notifications (
            StationId,
            NotificationType,
            Title,
            Message,
            RelatedOrderId,
            IsRead,
            CreatedAt
          )
          VALUES (
            @StationId,
            @NotificationType,
            @Title,
            @Message,
            @RelatedOrderId,
            0,
            GETDATE()
          )
        `)

      res.json({
        success: true
      })

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })
    }
  }

  // ==============================
  // GET NOTIFICATIONS
  // ==============================
  static async getByStation(req, res) {

    try {

      const pool = await getConnection()

      const result = await pool.request()
        .input(
          'StationId',
          sql.Int,
          req.user.StationId
        )
        .query(`
          SELECT *
          FROM Notifications
          WHERE StationId = @StationId
          ORDER BY CreatedAt DESC
        `)

      res.json(result.recordset)

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })
    }
  }

  // ==============================
  // UNREAD COUNT
  // ==============================
  static async getUnreadCount(req, res) {

    try {

      const pool = await getConnection()

      const result = await pool.request()
        .input(
          'StationId',
          sql.Int,
          req.user.StationId
        )
        .query(`
          SELECT COUNT(*) AS total
          FROM Notifications
          WHERE StationId = @StationId
          AND IsRead = 0
        `)

      res.json({
        total: result.recordset[0].total
      })

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })
    }
  }

  // ==============================
  // MARK SINGLE READ
  // ==============================
  static async markAsRead(req, res) {

    try {

      const id = req.params.id

      const pool = await getConnection()

      await pool.request()
        .input('Id', sql.Int, id)
        .query(`
          UPDATE Notifications
          SET IsRead = 1,
              ReadAt = GETDATE()
          WHERE Id = @Id
        `)

      res.json({
        success: true
      })

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })
    }
  }

  // ==============================
  // MARK ALL READ
  // ==============================
  static async markAllRead(req, res) {

    try {

      const pool = await getConnection()

      await pool.request()
        .input(
          'StationId',
          sql.Int,
          req.user.StationId
        )
        .query(`
          UPDATE Notifications
          SET IsRead = 1,
              ReadAt = GETDATE()
          WHERE StationId = @StationId
        `)

      res.json({
        success: true
      })

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })
    }
  }

  // ==============================
  // DELETE
  // ==============================
  static async deleteNotification(req, res) {

    try {

      const id = req.params.id

      const pool = await getConnection()

      await pool.request()
        .input('Id', sql.Int, id)
        .query(`
          DELETE FROM Notifications
          WHERE Id = @Id
        `)

      res.json({
        success: true
      })

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })
    }
  }

}

module.exports = NotificationController