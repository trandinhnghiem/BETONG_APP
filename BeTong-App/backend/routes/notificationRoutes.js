const express = require('express')

const { authMiddleware } =
  require('../middlewares/auth')

const NotificationController =
  require('../controllers/notificationController')

const NotificationModel =
  require('../models/Notification')

const router = express.Router()

// ===============================
// GET NOTIFICATIONS
// ===============================
router.get(
  '/',
  authMiddleware,
  async (req, res) => {

    try {

      const limit =
        parseInt(req.query.limit) || 50

      const offset =
        parseInt(req.query.offset) || 0

      const notifications =
        await NotificationModel.findByReceiver(
          req.user.Id,
          limit,
          offset
        )

      res.json(notifications)

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error: error.message
      })
    }
  }
)

// ===============================
// UNREAD COUNT
// ===============================
router.get(
  '/unread-count',
  authMiddleware,
  NotificationController.getUnreadCount
)

// ===============================
// MARK ALL READ
// ===============================
router.put(
  '/mark-read',
  authMiddleware,
  NotificationController.markAllRead
)

// ===============================
// MARK SINGLE READ
// ===============================
router.put(
  '/:id/read',
  authMiddleware,
  NotificationController.markAsRead
)

module.exports = router