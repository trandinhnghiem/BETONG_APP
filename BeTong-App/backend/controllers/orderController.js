const OrderModel = require('../models/Order')
const OrderItemModel = require('../models/OrderItem')
const ProductModel = require('../models/Product')
const StationModel = require('../models/Station')
const { getConnection, sql } = require('../config/database')
const NotificationService = require('../services/notificationService')

class OrderController {

  // ================= PRODUCTS =================
  static async getProducts(req, res) {
    try {
      const products = await ProductModel.findAll()
      res.json(products)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // ================= STATIONS =================
  static async getStations(req, res) {
    try {
      const stations = await StationModel.findAll()
      res.json(stations)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // ================= CREATE ORDER =================
  static async createOrder(req, res) {
    try {

      const { mixingStationId, notes, items } = req.body

      if (!mixingStationId || !items?.length) {
        return res.status(400).json({ error: 'Invalid data' })
      }

      const pool = await getConnection()
      const orderCode = 'ORD-' + Date.now()

      const totalAmount = items.reduce((s, i) =>
        s + i.quantity * i.unitPrice, 0)

      const result = await pool.request()
        .input('OrderCode', sql.NVarChar, orderCode)
        .input('CoordinatorId', sql.Int, req.user.Id)
        .input('SourceStationId', sql.Int, mixingStationId)
        .input('DestinationStationId', sql.Int, mixingStationId)
        .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
        .input('Notes', sql.NVarChar(sql.MAX), notes || '')
        .query(`
          INSERT INTO Orders (
            OrderCode, CoordinatorId, SourceStationId,
            DestinationStationId, TotalAmount, Notes,
            OrderStatus, CreatedAt, UpdatedAt
          )
          VALUES (
            @OrderCode, @CoordinatorId, @SourceStationId,
            @DestinationStationId, @TotalAmount, @Notes,
            'Pending Approval', GETDATE(), GETDATE()
          );

          SELECT SCOPE_IDENTITY() AS OrderId;
        `)

      const orderId = result.recordset[0].OrderId

      for (const item of items) {
        await pool.request()
          .input('OrderId', sql.Int, orderId)
          .input('ProductId', sql.Int, item.productId)
          .input('Quantity', sql.Float, item.quantity)
          .input('UnitPrice', sql.Decimal(18, 2), item.unitPrice)
          .query(`
            INSERT INTO OrderItems (
              OrderId, ProductId, Quantity, UnitPrice, CreatedAt
            )
            VALUES (
              @OrderId, @ProductId, @Quantity, @UnitPrice, GETDATE()
            )
          `)
      }

      const io = req.app.get('io')

      const createdMessage = `Đơn hàng ${orderCode} mới đã được tạo, đang chờ duyệt.`
      try {
        await NotificationService.notifyRoleUsers(
          io,
          'Accounting',
          'NewOrder',
          'Đơn hàng mới cần duyệt',
          createdMessage,
          orderId
        )

        await NotificationService.notifyRoleUsers(
          io,
          'Admin',
          'NewOrder',
          'Đơn hàng mới vừa được tạo',
          createdMessage,
          orderId
        )
      } catch (notifyError) {
        console.error('Failed to send new order notifications:', notifyError)
      }

      res.json({ message: 'OK', orderId, orderCode })

    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // ================= UPDATE STATUS (FIX FOR ROUTE) =================
  static async updateStatus(req, res) {
  try {

    const orderId = parseInt(req.params.orderId)
    const { status } = req.body

    const valid = [
      'Draft',
      'Pending Approval',
      'Approved',
      'Rejected',
      'Sent',
      'Delivered',
      'Completed'
    ]

    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    await OrderModel.updateStatus(orderId, status, req.user.Id)

    const pool = await getConnection()

    const order = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .query(`
        SELECT Id, OrderCode, DestinationStationId, CoordinatorId
        FROM Orders WHERE Id = @OrderId
      `)

    const o = order.recordset[0]

    const io = req.app.get('io')
    const statusMessage = `Đơn hàng ${o.OrderCode} đã chuyển sang trạng thái ${status}.`

    try {
      await NotificationService.notifyStationUsers(
        io,
        o.DestinationStationId,
        'OrderStatusChanged',
        'Trạng thái đơn hàng đã thay đổi',
        statusMessage,
        o.Id
      )

      if (status === 'Completed') {
        await NotificationService.notifyRoleUsers(
          io,
          'Accounting',
          'RevenueUpdate',
          'Doanh thu mới',
          `Đơn hàng ${o.OrderCode} đã hoàn tất và cần đối soát doanh thu.`,
          o.Id
        )
      }

      if (status === 'Rejected' && o.CoordinatorId) {
        await NotificationService.sendUserNotification(
          io,
          o.CoordinatorId,
          'OrderRejected',
          'Đơn hàng bị từ chối',
          `Đơn hàng ${o.OrderCode} đã bị từ chối.`,
          o.Id
        )
      }
    } catch (notifyError) {
      console.error('Failed to send status update notifications:', notifyError)
    }

    return res.json({ message: 'Updated', status })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

  // ================= APPROVE =================
  static async approveOrder(req, res) {
  try {
    const orderId = parseInt(req.params.orderId)

    const pool = await getConnection()

    // 1. update status
    await OrderModel.updateStatus(orderId, 'Approved', req.user.Id)

    // 2. get order
    const result = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .query(`
        SELECT Id, OrderCode, DestinationStationId, CoordinatorId, OrderStatus
        FROM Orders WHERE Id = @OrderId
      `)

    const order = result.recordset[0]
    if (!order) return res.status(404).json({ error: 'Not found' })

    const io = req.app.get('io')

    const message = `Đơn hàng ${order.OrderCode} đã được duyệt.`

    try {
      await NotificationService.notifyStationUsers(
        io,
        order.DestinationStationId,
        'OrderApproved',
        'Đơn hàng đã duyệt',
        message,
        order.Id
      )

      if (order.CoordinatorId) {
        await NotificationService.sendUserNotification(
          io,
          order.CoordinatorId,
          'OrderApproved',
          'Đơn hàng của bạn đã duyệt',
          message,
          order.Id
        )
      }
    } catch (notifyError) {
      console.error('Failed to send approval notifications:', notifyError)
    }

    res.json({ message: 'Approved' })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

  // ================= REJECT =================
  static async rejectOrder(req, res) {
    try {

      const orderId = parseInt(req.params.orderId)

      await OrderModel.updateStatus(orderId, 'Rejected', req.user.Id)

    const pool = await getConnection()
    const result = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .query(`
        SELECT Id, OrderCode, CoordinatorId
        FROM Orders WHERE Id = @OrderId
      `)

    const order = result.recordset[0]
    const message = order
      ? `Đơn hàng ${order.OrderCode} đã bị từ chối.`
      : 'Đơn hàng đã bị từ chối.'

    if (order?.CoordinatorId) {
      try {
        const io = req.app.get('io')
        await NotificationService.sendUserNotification(
          io,
          order.CoordinatorId,
          'OrderRejected',
          'Đơn hàng bị từ chối',
          message,
          order.Id
        )
      } catch (notifyError) {
        console.error('Failed to send rejection notification:', notifyError)
      }
    }

    res.json({ message: 'Rejected' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

  // ================= OTHER ROUTES KEEP SAFE =================
  static async getMyOrders(req, res) {
    const orders = await OrderModel.findByCoordinator(req.user.Id)
    res.json(orders)
  }

  static async getAllOrders(req, res) {
    const orders = await OrderModel.findAll()
    res.json(orders)
  }

  static async getOrderById(req, res) {
    const order = await OrderModel.findById(req.params.orderId)
    res.json(order)
  }

  static async getPendingApprovalOrders(req, res) {
    const orders = await OrderModel.findPendingApproval()
    res.json(orders)
  }

  static async getAccountingOrders(req, res) {
  try {
    const pool = await getConnection()

    const result = await pool.request().query(`
      SELECT 
        o.Id,
        o.OrderCode,
        o.TotalAmount,
        o.OrderStatus,
        o.CreatedAt,

        s.StationName AS DestinationStation,
        u.FullName AS CoordinatorName

      FROM Orders o
      LEFT JOIN Stations s ON o.DestinationStationId = s.Id
      LEFT JOIN Users u ON o.CoordinatorId = u.Id

      ORDER BY o.CreatedAt DESC
    `)

    res.json(result.recordset)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

  static async getStationOrders(req, res) {
    const pool = await getConnection()
    const result = await pool.request()
      .input('StationId', sql.Int, req.user.StationId)
      .query(`
        SELECT * FROM Orders
        WHERE DestinationStationId = @StationId
      `)

    res.json(result.recordset)
  }

  static async exportOrdersReport(req, res) {
    const orders = await OrderModel.findAll()
    res.json(orders)
  }

  static async confirmPayment(req, res) {
    res.json({ message: 'Payment confirmed' })
  }
}

module.exports = OrderController