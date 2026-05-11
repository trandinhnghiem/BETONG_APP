const jwt = require('jsonwebtoken')
const UserModel = require('../models/User')

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'Token not provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    const user = await UserModel.findById(decoded.id)

    if (!user || !user.IsActive) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.Role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    next()
  }
}

module.exports = {
  authMiddleware,
  roleMiddleware
}

