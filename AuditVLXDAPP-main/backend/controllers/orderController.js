const OrderModel = require('../models/Order')
const OrderItemModel = require('../models/OrderItem')
const ProductModel = require('../models/Product')
const StationModel = require('../models/Station')
const NotificationModel = require('../models/Notification')
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
          title: 'Order Approved',
          message: `Your order ${order.OrderCode} has been approved`,
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
          title: 'Order Rejected',
          message: `Your order ${order.OrderCode} has been rejected`,
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