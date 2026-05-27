const express = require('express')
const { authMiddleware } = require('../middlewares/auth')
const NotificationController = require('../controllers/NotificationController')

const router = express.Router()

// Tất cả route đều cần đăng nhập
router.use(authMiddleware)

// ===============================
// GET NOTIFICATIONS (theo user)
// ===============================
router.get(
  '/',
  NotificationController.getAll
)

// ===============================
// UNREAD COUNT
// ===============================
router.get(
  '/unread-count',
  NotificationController.getUnreadCount
)

// ===============================
// MARK ALL READ
// ===============================
router.put(
  '/mark-all-read',
  NotificationController.markAllRead
)

// ===============================
// MARK SINGLE READ
// ===============================
router.put(
  '/:id/read',
  NotificationController.markAsRead
)

// ===============================
// DELETE SINGLE
// ===============================
router.delete(
  '/:id',
  NotificationController.deleteNotification
)

module.exports = router
