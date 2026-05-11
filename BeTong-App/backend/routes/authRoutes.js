const express = require('express')
const AuthController = require('../controllers/authController')
const { authMiddleware } = require('../middlewares/auth')

const router = express.Router()

router.post('/login', AuthController.login)
router.post('/register', AuthController.register)
router.get('/profile', authMiddleware, AuthController.getProfile)

module.exports = router
