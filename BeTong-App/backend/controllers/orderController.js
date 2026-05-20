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

    const {
      mixingStationId,
      notes,
      items,
      customerName,
      address,
      phone
    } = req.body

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

      // ⭐ CUSTOMER INFO
      .input('CustomerName', sql.NVarChar, customerName)
      .input('Address', sql.NVarChar, address)
      .input('Phone', sql.NVarChar, phone)

      .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
      .input('Notes', sql.NVarChar(sql.MAX), notes || '')

      .query(`
        INSERT INTO Orders (
          OrderCode,
          CoordinatorId,
          SourceStationId,
          DestinationStationId,
          CustomerName,
          Address,
          Phone,
          TotalAmount,
          Notes,
          OrderStatus,
          CreatedAt,
          UpdatedAt
        )
        VALUES (
          @OrderCode,
          @CoordinatorId,
          @SourceStationId,
          @DestinationStationId,
          @CustomerName,
          @Address,
          @Phone,
          @TotalAmount,
          @Notes,
          'Draft',
          GETDATE(),
          GETDATE()
        );

        SELECT SCOPE_IDENTITY() AS OrderId;
      `)

    const orderId = result.recordset[0].OrderId

    // ORDER ITEMS
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

    res.status(201).json({
      message: 'Order created',
      orderId,
      orderCode
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

  // ================= UPDATE STATUS (FIX FOR ROUTE) =================
  static async updateStatus(req, res) {
    try {
      const orderId = parseInt(req.params.orderId)
      const { status } = req.body

      const allowedStatuses = [
        'Draft',
        'Pending Approval',
        'Approved',
        'Processing',
        'Delivering',
        'Completed',
        'Cancelled'
      ]

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }

      const order = await OrderModel.findById(orderId)
      if (!order) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const currentStatus = order.OrderStatus
      const transitions = {
        Draft: ['Pending Approval'],
        'Pending Approval': ['Approved', 'Cancelled'],
        Approved: ['Processing'],
        Processing: ['Delivering'],
        Delivering: ['Completed'],
        Completed: [],
        Cancelled: []
      }

      if (!transitions[currentStatus]?.includes(status)) {
        return res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${status}` })
      }

      const roleAllowed = {
        Coordinator: {
          Draft: ['Pending Approval']
        },
        Accounting: {
          'Pending Approval': ['Approved', 'Cancelled']
        },
        Station: {
          Approved: ['Processing'],
          Processing: ['Delivering'],
          Delivering: ['Completed']
        }
      }

      const allowedByRole = roleAllowed[req.user.Role]?.[currentStatus] || []
      if (!allowedByRole.includes(status)) {
        return res.status(403).json({ error: 'You are not allowed to perform this status transition' })
      }

      const updated = await OrderModel.updateStatus(orderId, status, req.user.Id)
      if (!updated) {
        return res.status(500).json({ error: 'Failed to update status' })
      }

      const io = req.app.get('io')
      const statusMessage = `Đơn hàng ${order.OrderCode} đã chuyển sang trạng thái ${status}.`

      try {
        if (status === 'Pending Approval') {
          await NotificationService.notifyRoleUsers(
            io,
            'Accounting',
            'OrderPendingApproval',
            'Đơn hàng mới chờ duyệt',
            statusMessage,
            order.Id
          )
        }

        if (status === 'Approved') {
          await NotificationService.notifyStationUsers(
            io,
            order.DestinationStationId,
            'OrderApproved',
            'Đơn hàng đã được duyệt',
            statusMessage,
            order.Id
          )
        }

        if (status === 'Cancelled' && order.CoordinatorId) {
          await NotificationService.sendUserNotification(
            io,
            order.CoordinatorId,
            'OrderCancelled',
            'Đơn hàng đã bị hủy',
            statusMessage,
            order.Id
          )
        }

        if (status === 'Completed') {
          await NotificationService.notifyRoleUsers(
            io,
            'Accounting',
            'OrderCompleted',
            'Đơn hàng hoàn thành',
            statusMessage,
            order.Id
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
        ORDER BY CreatedAt DESC
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