const OrderModel = require('../models/Order')
const OrderItemModel = require('../models/OrderItem')
const ProductModel = require('../models/Product')
const StationModel = require('../models/Station')
const NotificationModel = require('../models/Notification')
const UserModel = require('../models/User')
const { getConnection, sql } = require('../config/database')


class OrderController {

  // ================= CREATE ORDER =================
  static async createOrder(req, res) {
    try {
      const { mixingStationId, notes, items } = req.body

      if (!mixingStationId) {
        return res.status(400).json({ error: 'Trạm trộn là bắt buộc' })
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Phải có ít nhất 1 mục trong đơn hàng' })
      }

      const pool = await getConnection()
      const coordinatorId = req.user.Id

      // ✅ Tạo mã đơn
      const orderCode = 'ORD-' + Date.now()

      // ✅ Tính tổng tiền
      const totalAmount = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice)
      }, 0)

      const result = await pool.request()
        .input('OrderCode', sql.NVarChar, orderCode)
        .input('CoordinatorId', sql.Int, coordinatorId)
        .input('SourceStationId', sql.Int, parseInt(mixingStationId))
        .input('DestinationStationId', sql.Int, parseInt(mixingStationId))
        .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
        .input('Notes', sql.NVarChar(sql.MAX), notes || '')
        .query(`
          INSERT INTO Orders (
            OrderCode, CoordinatorId, SourceStationId, DestinationStationId,
            TotalAmount, Notes, OrderStatus, CreatedAt, UpdatedAt
          )
          VALUES (
            @OrderCode, @CoordinatorId, @SourceStationId, @DestinationStationId,
            @TotalAmount, @Notes, 'Pending Approval', GETDATE(), GETDATE()
          );

          SELECT SCOPE_IDENTITY() AS OrderId;
        `)

      const orderId = result.recordset[0].OrderId

      // ✅ Thêm order items
      for (const item of items) {
        await pool.request()
          .input('OrderId', sql.Int, orderId)
          .input('ProductId', sql.Int, item.productId)
          .input('Quantity', sql.Float, item.quantity)
          .input('UnitPrice', sql.Decimal(18, 2), item.unitPrice)
          .query(`
            INSERT INTO OrderItems (OrderId, ProductId, Quantity, UnitPrice, CreatedAt)
            VALUES (@OrderId, @ProductId, @Quantity, @UnitPrice, GETDATE())
          `)
      }

      res.json({
        message: 'Tạo đơn thành công',
        orderId,
        orderCode
      })

    } catch (err) {
      console.error('CreateOrder Error:', err)
      res.status(500).json({ error: err.message })
    }
  }

  // ================= GET MY ORDERS =================
  static async getMyOrders(req, res) {
    try {
      
      const coordinatorId = req.user.Id
      const { limit = 50, offset = 0 } = req.query

      const orders = await OrderModel.findByCoordinator(
        coordinatorId,
        parseInt(limit),
        parseInt(offset)
      )

      res.json(orders)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  // ================= GET PENDING =================
  static async getPendingApprovalOrders(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query
      const orders = await OrderModel.findPendingApproval(parseInt(limit), parseInt(offset))
      res.json(orders)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  // ================= GET ALL =================
  static async getAllOrders(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query
      const orders = await OrderModel.findAll(parseInt(limit), parseInt(offset))
      res.json(orders)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  // ================= GET BY ID =================
  static async getOrderById(req, res) {
    try {
      const orderId = parseInt(req.params.orderId)

      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'Invalid order ID' })
      }

      const order = await OrderModel.findById(orderId)
      if (!order) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const items = await OrderItemModel.findByOrderId(orderId)

      res.json({
        ...order,
        items
      })

    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  // ================= UPDATE STATUS =================
  static async updateStatus(req, res) {
    try {
      const orderId = parseInt(req.params.orderId)
      const { status } = req.body
      const userId = req.user.Id

      const validStatuses = [
        'Draft',
        'Pending Approval',
        'Approved',
        'Rejected',
        'Uploading',
        'Sent',
        'Delivered',
        'Completed'
      ]

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }

      const success = await OrderModel.updateStatus(orderId, status, userId)

      if (!success) {
        return res.status(404).json({ error: 'Order not found' })
      }

      res.json({ message: 'Order status updated successfully' })

    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  // ================= PRODUCTS =================
  static async getProducts(req, res) {
    try {
      const products = await ProductModel.findAll()
      res.json(products)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  static async approveOrder(req, res) {
    try {
      const orderId = parseInt(req.params.orderId)
      const { approvalReason } = req.body
      const userId = req.user.Id

      const success = await OrderModel.updateStatus(orderId, 'Approved', userId)
      
      if (!success) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const pool = await getConnection()
      await pool.request()
        .input('OrderId', sql.Int, orderId)
        .input('ApprovedBy', sql.Int, userId)
        .input('ApprovalReason', sql.NVarChar(sql.MAX), approvalReason || '')
        .query(`UPDATE Orders SET ApprovedBy = @ApprovedBy, ApprovedAt = GETDATE(), ApprovalReason = @ApprovalReason WHERE Id = @OrderId`)

      res.json({ message: 'Đơn hàng đã được phê duyệt' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  static async rejectOrder(req, res) {
    try {
      const orderId = parseInt(req.params.orderId)
      const { rejectionReason } = req.body
      const userId = req.user.Id

      const success = await OrderModel.updateStatus(orderId, 'Rejected', userId)
      
      if (!success) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const pool = await getConnection()
      await pool.request()
        .input('OrderId', sql.Int, orderId)
        .input('RejectionReason', sql.NVarChar(sql.MAX), rejectionReason || '')
        .query(`UPDATE Orders SET RejectionReason = @RejectionReason WHERE Id = @OrderId`)

      res.json({ message: 'Đơn hàng đã bị từ chối' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  static async confirmPayment(req, res) {
    try {
      const orderId = parseInt(req.params.orderId)
      const { paymentMethod, paymentAmount } = req.body
      const userId = req.user.Id

      const pool = await getConnection()
      await pool.request()
        .input('OrderId', sql.Int, orderId)
        .input('PaymentStatus', sql.NVarChar, 'Confirmed')
        .input('PaymentConfirmedBy', sql.Int, userId)
        .input('PaymentMethod', sql.NVarChar, paymentMethod || '')
        .input('PaymentAmount', sql.Decimal(18, 2), paymentAmount || 0)
        .query(`
          UPDATE Orders 
          SET PaymentStatus = @PaymentStatus, 
              PaymentConfirmedBy = @PaymentConfirmedBy,
              PaymentConfirmedAt = GETDATE(),
              PaymentMethod = @PaymentMethod,
              PaymentAmount = @PaymentAmount
          WHERE Id = @OrderId
        `)

      res.json({ message: 'Thanh toán đã được xác nhận' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  static async getStationOrders(req, res) {
    try {
      const stationId = req.user.StationId
      const { limit = 50, offset = 0 } = req.query

      if (!stationId) {
        return res.status(400).json({ error: 'Station ID not found' })
      }

      const pool = await getConnection()
      const result = await pool.request()
        .input('StationId', sql.Int, stationId)
        .input('Limit', sql.Int, parseInt(limit))
        .input('Offset', sql.Int, parseInt(offset))
        .query(`
          SELECT 
          o.Id,
          o.OrderCode,
          o.TotalAmount,
          o.OrderStatus,
          o.CreatedAt,
          s.StationName AS DestinationStation,
          c.FullName AS CoordinatorName
        FROM Orders o
        LEFT JOIN Stations s ON o.DestinationStationId = s.Id
        LEFT JOIN Users c ON o.CoordinatorId = c.Id
        WHERE o.DestinationStationId = @StationId
        ORDER BY o.CreatedAt DESC
        `)

      res.json(result.recordset)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  static async exportOrdersReport(req, res) {
    try {
      const { limit = 1000, offset = 0 } = req.query
      const orders = await OrderModel.findAll(parseInt(limit), parseInt(offset))
      
      // Simple JSON export, can be enhanced to CSV/Excel later
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename="orders-report.json"')
      res.json(orders)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  

  // ================= STATIONS =================
  static async getStations(req, res) {
    try {
      const stations = await StationModel.findAll()
      res.json(stations)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
}

module.exports = OrderController