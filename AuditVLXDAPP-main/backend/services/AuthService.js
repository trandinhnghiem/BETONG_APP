const jwt = require('jsonwebtoken')
const UserModel = require('../models/User')

class AuthService {
  static async login(username, password) {
    const user = await UserModel.findByUsername(username)

    if (!user) {
      throw new Error('User not found')
    }

    if (!user.IsActive) {
      throw new Error('User account is inactive')
    }

    const isPasswordValid = await UserModel.verifyPassword(password, user.PasswordHash)

    if (!isPasswordValid) {
      throw new Error('Invalid password')
    }

    const token = jwt.sign(
      { id: user.Id, username: user.Username, role: user.Role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    return {
      token,
      user: {
        id: user.Id,
        username: user.Username,
        email: user.Email,
        fullName: user.FullName,
        role: user.Role
      }
    }
  }

  static async register(userData) {
    const existingUser = await UserModel.findByUsername(userData.username)

    if (existingUser) {
      throw new Error('Username already exists')
    }

    const newUser = await UserModel.create({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      phone: userData.phone,
      role: userData.role || 'Coordinator'
    })

    const token = jwt.sign(
      { id: newUser.id, username: userData.username, role: userData.role || 'Coordinator' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    return {
      token,
      user: {
        id: newUser.id,
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'Coordinator'
      }
    }
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    } catch (error) {
      throw new Error('Invalid token')
    }
  }
}

module.exports = AuthService
