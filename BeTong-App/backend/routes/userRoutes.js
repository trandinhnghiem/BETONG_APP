const express = require('express')
const { authMiddleware, roleMiddleware } = require('../middlewares/auth')
const UserModel = require('../models/User')

const router = express.Router()

router.use(authMiddleware)

// Get all users (Admin only)
router.get('/', roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { limit = 50, offset = 0, role } = req.query
    
    const users = await UserModel.findAll(parseInt(limit), parseInt(offset))
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const user = await UserModel.findById(parseInt(req.params.userId))
    if (user) {
      res.json(user)
    } else {
      res.status(404).json({ error: 'User not found' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update user (Admin only or self)
router.put('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    
    // Check if user is admin or updating their own profile
    if (req.user.Role !== 'Admin' && req.user.Id !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const success = await UserModel.update(userId, req.body)
    if (success) {
      res.json({ message: 'User updated successfully' })
    } else {
      res.status(404).json({ error: 'User not found' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
