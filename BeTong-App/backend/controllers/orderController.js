const OrderModel = require('../models/Order')
const OrderItemModel = require('../models/OrderItem')
const ProductModel = require('../models/Product')
const StationModel = require('../models/Station')
const NotificationModel = require('../models/Notification')
const UserModel = require('../models/User')
const { getConnection, sql } = require('../config/database')

class OrderController {
  static async createOrder(req, res) {
    try {
      const { sourceStation, destinationStation, items, notes } = req.body
      const coordinatorId = req.user.Id

      if (!sourceStation || !destinationStation || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Validate stations exist
      const sourceStationData = await StationModel.findById(sourceStation)
      const destStationData = await StationModel.findById(destinationStation)

      if (!sourceStationData || !destStationData) {
        return res.status(400).json({ error: 'Invalid station IDs' })
      }

      if (sourceStation === destinationStation) {
        return res.status(400).json({ error: 'Source and destination stations cannot be the same' })
      }

      // Calculate total amount
      let totalAmount = 0
      for (const item of items) {
        const product = await ProductModel.findById(item.productId)
        if (!product) {
          return res.status(400).json({ error: `Product ${item.productId} not found` })
        }
        totalAmount += item.quantity * product.UnitPrice
      }

      const orderCode = `ORD-${Date.now()}`

      const orderResult = await OrderModel.create({
        orderCode,
        coordinatorId,
        sourceStationId: sourceStation,
        destinationStationId: destinationStation,
        totalAmount,
        notes
      })

      // Insert order items
      for (const item of items) {
        await OrderItemModel.create(orderResult.id, {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })
      }

      // Update order status to Pending Approval
      await OrderModel.updateStatus(orderResult.id, 'Pending Approval')

      // Notify Accounting users that a new order requires approval
      const accountingUsers = await UserModel.findByRole('Accounting')
      for (const accountingUser of accountingUsers) {
        await NotificationModel.create({
          receiverId: accountingUser.Id,
          notificationType: 'OrderPendingApproval',
          title: 'Đơn hàng cần duyệt',
          message: `Đơn ${orderCode} đã được tạo và đang chờ kế toán duyệt.`,
          relatedOrderId: orderResult.id
        })
      }

      res.status(201).json({
        message: 'Order created successfully',
        orderId: orderResult.id,
        orderCode
      })
    } catch (error) {
      console.error('Create order error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async getMyOrders(req, res) {
    try {
      const coordinatorId = req.user.Id
      const { limit = 50, offset = 0 } = req.query

      const orders = await OrderModel.findByCoordinator(coordinatorId, parseInt(limit), parseInt(offset))

      res.json(orders)
    } catch (error) {
      console.error('Get my orders error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async getPendingApprovalOrders(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query

      const orders = await OrderModel.findPendingApproval(parseInt(limit), parseInt(offset))

      res.json(orders)
    } catch (error) {
      console.error('Get pending approval orders error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async getAllOrders(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query

      const orders = await OrderModel.findAll(parseInt(limit), parseInt(offset))

      res.json(orders)
    } catch (error) {
      console.error('Get all orders error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async getOrderById(req, res) {
    try {
      const { orderId } = req.params
      const orderIdInt = parseInt(orderId)

      if (isNaN(orderIdInt)) {
        return res.status(400).json({ error: 'Invalid order ID' })
      }

      const order = await OrderModel.findById(orderIdInt)
      if (!order) {
        return res.status(404).json({ error: 'Order not found' })
      }

      // Get order items
      const items = await OrderItemModel.findByOrderId(orderIdInt)

      res.json({
        ...order,
        items
      })
    } catch (error) {
      console.error('Get order by ID error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async getStationOrders(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query
      const orders = await OrderModel.findSentToStation(parseInt(limit), parseInt(offset))
      res.json(orders)
    } catch (error) {
      console.error('Get station orders error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async exportOrdersReport(req, res) {
    try {
      const orders = await OrderModel.findAll(1000, 0)
      const headers = ['Mã đơn', 'Điều phối', 'Trạm gửi', 'Trạm nhận', 'Trạng thái', 'Thanh toán', 'Tổng tiền', 'Ngày tạo']
      const csvRows = [headers.join(',')]

      orders.forEach((order) => {
        const row = [
          order.OrderCode,
          order.CoordinatorName || '',
          order.SourceStation || '',
          order.DestinationStation || '',
          order.OrderStatus || '',
          order.PaymentStatus || '',
          order.TotalAmount || 0,
          order.CreatedAt ? new Date(order.CreatedAt).toISOString() : ''
        ]
        csvRows.push(row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      })

      const csvContent = csvRows.join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="order-report.csv"')
      res.send(csvContent)
    } catch (error) {
      console.error('Export orders report error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async approveOrder(req, res) {
    try {
      const { orderId } = req.params
      const { approvalReason } = req.body
      const accountingId = req.user.Id

      const success = await OrderModel.approve(parseInt(orderId), accountingId, approvalReason)

      if (!success) {
        return res.status(404).json({ error: 'Order not found or not in pending approval status' })
      }

      // Create notification for coordinator
      const order = await OrderModel.findById(parseInt(orderId))
      if (order) {
        await NotificationModel.create({
          receiverId: order.CoordinatorId,
          notificationType: 'OrderApproved',
          title: 'Đơn hàng đã được duyệt',
          message: `Đơn ${order.OrderCode} đã được kế toán duyệt.`,
          relatedOrderId: parseInt(orderId)
        })
      }

      res.json({ message: 'Order approved successfully' })
    } catch (error) {
      console.error('Approve order error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async rejectOrder(req, res) {
    try {
      const { orderId } = req.params
      const { rejectionReason } = req.body
      const accountingId = req.user.Id

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return res.status(400).json({ error: 'Rejection reason is required' })
      }

      const success = await OrderModel.reject(parseInt(orderId), accountingId, rejectionReason)

      if (!success) {
        return res.status(404).json({ error: 'Order not found or not in pending approval status' })
      }

      // Create notification for coordinator
      const order = await OrderModel.findById(parseInt(orderId))
      if (order) {
        await NotificationModel.create({
          receiverId: order.CoordinatorId,
          notificationType: 'OrderRejected',
          title: 'Đơn hàng bị từ chối',
          message: `Đơn ${order.OrderCode} đã bị kế toán từ chối.`,
          relatedOrderId: parseInt(orderId)
        })
      }

      res.json({ message: 'Order rejected successfully' })
    } catch (error) {
      console.error('Reject order error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async updateStatus(req, res) {
    try {
      const { orderId } = req.params
      const { status } = req.body
      const userId = req.user.Id

      const validStatuses = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Uploading', 'Sent', 'Delivered', 'Completed']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }

      const success = await OrderModel.updateStatus(parseInt(orderId), status, userId)

      if (!success) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const order = await OrderModel.findById(parseInt(orderId))
      if (order) {
        if (status === 'Sent') {
          const stationUsers = await UserModel.findByRole('Station')
          for (const stationUser of stationUsers) {
            await NotificationModel.create({
              receiverId: stationUser.Id,
              notificationType: 'OrderSentToStation',
              title: 'Đơn hàng mới đã gửi tới trạm',
              message: `Đơn ${order.OrderCode} đã được gửi tới trạm ${order.DestinationStation}.`,
              relatedOrderId: parseInt(orderId)
            })
          }
        }

        if (status === 'Delivered') {
          await NotificationModel.create({
            receiverId: order.CoordinatorId,
            notificationType: 'OrderDelivered',
            title: 'Đơn hàng đã được trạm nhận',
            message: `đơn ${order.OrderCode} đã được trạm xác nhận nhận.`,
            relatedOrderId: parseInt(orderId)
          })
        }
      }

      res.json({ message: 'Order status updated successfully' })
    } catch (error) {
      console.error('Update order status error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async confirmPayment(req, res) {
    try {
      const { orderId } = req.params
      const { paymentMethod } = req.body
      const accountingId = req.user.Id

      const success = await OrderModel.confirmPayment(parseInt(orderId), accountingId, paymentMethod)

      if (!success) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const order = await OrderModel.findById(parseInt(orderId))
      if (order) {
        await NotificationModel.create({
          receiverId: order.CoordinatorId,
          notificationType: 'PaymentConfirmed',
          title: 'Thanh toán đã được xác nhận',
          message: `Thanh toán đơn ${order.OrderCode} đã được kế toán xác nhận.`,
          relatedOrderId: parseInt(orderId)
        })
      }

      res.json({ message: 'Payment confirmed successfully' })
    } catch (error) {
      console.error('Confirm payment error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  // Additional endpoints for frontend
  static async getProducts(req, res) {
    try {
      const products = await ProductModel.findAll()
      res.json(products)
    } catch (error) {
      console.error('Get products error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async getStations(req, res) {
    try {
      const stations = await StationModel.findAll()
      res.json(stations)
    } catch (error) {
      console.error('Get stations error:', error)
      res.status(500).json({ error: error.message })
    }
  }
}

module.exports = OrderController