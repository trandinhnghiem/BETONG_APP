const express = require('express')
const { authMiddleware } = require('../middlewares/auth')
const NotificationModel = require('../models/Notification')

const router = express.Router()

// ===============================
// GET NOTIFICATIONS
// ===============================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

    const notifications = await NotificationModel.findByReceiver(
      req.user.Id,
      limit,
      offset
    )

    res.json(notifications)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

// ===============================
// MARK AS READ
// ===============================
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const notification = await NotificationModel.findById(id)

    if (!notification || notification.ReceiverId !== req.user.Id) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    await NotificationModel.markAsRead(id)

    res.json({ message: 'Đã đọc' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router