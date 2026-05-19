const NotificationModel = require('../models/Notification')
const UserModel = require('../models/User')

class NotificationService {
  static async sendUserNotification(io, userId, notificationType, title, message, relatedOrderId = null) {
    const notification = await NotificationModel.create({
      receiverId: userId,
      notificationType,
      title,
      message,
      relatedOrderId
    })

    io.to(`user_${userId}`).emit('notification', {
      Id: notification.id || notification.Id,
      ReceiverId: userId,
      NotificationType: notificationType,
      Title: title,
      Message: message,
      RelatedOrderId: relatedOrderId,
      IsRead: false,
      CreatedAt: new Date().toISOString()
    })

    return notification
  }

  static async notifyRoleUsers(io, role, notificationType, title, message, relatedOrderId = null) {
    const users = await UserModel.findByRole(role)
    const notifications = []

    for (const user of users) {
      const notification = await NotificationModel.create({
        receiverId: user.Id,
        notificationType,
        title,
        message,
        relatedOrderId
      })
      notifications.push(notification)
    }

    if (users.length > 0) {
      io.to(`role_${role}`).emit('notification', {
        Id: Date.now(),
        NotificationType: notificationType,
        Title: title,
        Message: message,
        RelatedOrderId: relatedOrderId,
        IsRead: false,
        CreatedAt: new Date().toISOString()
      })
    }

    return notifications
  }

  static async notifyStationUsers(io, stationId, notificationType, title, message, relatedOrderId = null) {
    const users = await UserModel.findByStationId(stationId)
    const notifications = []

    for (const user of users) {
      const notification = await NotificationModel.create({
        receiverId: user.Id,
        notificationType,
        title,
        message,
        relatedOrderId
      })
      notifications.push(notification)
    }

    if (users.length > 0) {
      io.to(`station_${stationId}`).emit('notification', {
        Id: Date.now(),
        NotificationType: notificationType,
        Title: title,
        Message: message,
        RelatedOrderId: relatedOrderId,
        IsRead: false,
        CreatedAt: new Date().toISOString()
      })
    }

    return notifications
  }
}

module.exports = NotificationService
