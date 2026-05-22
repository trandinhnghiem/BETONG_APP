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


// Update user
router.put('/:userId', roleMiddleware(['Admin']), async (req, res) => {
  try {

    const userId = parseInt(req.params.userId)

    console.log('UPDATE USER ID:', userId)
    console.log('REQUEST BODY:', req.body)

    const success = await UserModel.update(
      userId,
      req.body
    )

    if (success) {

      const updatedUser =
        await UserModel.findById(userId)

      res.json({
        message: 'User updated successfully',
        data: updatedUser
      })

    } else {

      res.status(404).json({
        error: 'User not found'
      })

    }

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }
})

// Delete user (Admin only)
router.delete('/:userId', roleMiddleware(['Admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)

    // Không cho tự xóa chính mình
    if (req.user.Id === userId) {
      return res.status(400).json({
        error: 'Không thể tự xóa tài khoản của chính mình'
      })
    }

    const success = await UserModel.delete(userId)

    if (success) {
      res.json({
        message: 'User deleted successfully'
      })
    } else {
      res.status(404).json({
        error: 'User not found'
      })
    }
  } catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
})


module.exports = router
