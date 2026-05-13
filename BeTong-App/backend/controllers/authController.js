const jwt = require('jsonwebtoken')
const UserModel = require('../models/User')

class AuthController {
  static async login(req, res) {
    try {
      const { username, password } = req.body

      console.log('INPUT:', username, password) // ✅ thêm

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' })
      }

      const user = await UserModel.findByUsername(username)

      console.log('DB USER:', user) // ✅ thêm

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      if (!user.IsActive) {
        return res.status(401).json({ error: 'Account is inactive' })
      }

      const isPasswordValid = await UserModel.verifyPassword(password, user.PasswordHash)

      console.log('PASSWORD MATCH:', isPasswordValid) // ✅ thêm
      console.log('USER STATION ID:', user.StationId) // ✅ thêm

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const token = jwt.sign(
        { id: user.Id, username: user.Username, role: user.Role, stationId: user.StationId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      )

      res.json({
        token,
        user: {
          id: user.Id,
          username: user.Username,
          email: user.Email,
          fullName: user.FullName,
          role: user.Role
        }
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  static async register(req, res) {
    try {
      const { username, email, password, fullName, phone, role } = req.body

      if (!username || !email || !password || !fullName) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const existingUser = await UserModel.findByUsername(username)

      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' })
      }

      const newUser = await UserModel.create({
        username,
        email,
        password,
        fullName,
        phone,
        role: role || 'Coordinator'
      })

      const token = jwt.sign(
        { id: newUser.id, username, role: role || 'Coordinator' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      )

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          username,
          email,
          fullName,
          role: role || 'Coordinator'
        }
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await UserModel.findById(req.user.Id)

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json(user)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
}

module.exports = AuthController
