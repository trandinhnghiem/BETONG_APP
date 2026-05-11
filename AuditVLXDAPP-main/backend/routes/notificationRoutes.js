const express = require('express')
const { authMiddleware } = require('../middlewares/auth')
const NotificationModel = require('../models/Notification')

const router = express.Router()

router.use(authMiddleware)

// Get notifications for current user
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const notifications = await NotificationModel.findByReceiver(
      req.user.Id,
      parseInt(limit),
      parseInt(offset)
    )
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get unread notifications
router.get('/unread', async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const notifications = await NotificationModel.findUnread(req.user.Id, parseInt(limit))
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const success = await NotificationModel.markAsRead(parseInt(req.params.notificationId))
    if (success) {
      res.json({ message: 'Notification marked as read' })
    } else {
      res.status(404).json({ error: 'Notification not found' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
