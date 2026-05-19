const OrderModel = require('../models/Order')
const OrderItemModel = require('../models/OrderItem')
const ProductModel = require('../models/Product')
const StationModel = require('../models/Station')
const { getConnection, sql } = require('../config/database')

class OrderController {

  // ================= CREATE ORDER =================
  static async createOrder(req, res) {

    try {

      const {
        mixingStationId,
        notes,
        items
      } = req.body

      if (!mixingStationId) {

        return res.status(400).json({
          error: 'Trạm trộn là bắt buộc'
        })

      }

      if (!items || items.length === 0) {

        return res.status(400).json({
          error: 'Phải có ít nhất 1 mục trong đơn hàng'
        })

      }

      if (!req.user) {

        return res.status(401).json({
          error: 'Unauthorized'
        })

      }

      const pool =
        await getConnection()

      const coordinatorId =
        req.user.Id

      const orderCode =
        'ORD-' + Date.now()

      const totalAmount =
        items.reduce((sum, item) => {

          return sum +
            (item.quantity * item.unitPrice)

        }, 0)

      const result =
        await pool.request()

          .input(
            'OrderCode',
            sql.NVarChar,
            orderCode
          )

          .input(
            'CoordinatorId',
            sql.Int,
            coordinatorId
          )

          .input(
            'SourceStationId',
            sql.Int,
            parseInt(mixingStationId)
          )

          .input(
            'DestinationStationId',
            sql.Int,
            parseInt(mixingStationId)
          )

          .input(
            'TotalAmount',
            sql.Decimal(18, 2),
            totalAmount
          )

          .input(
            'Notes',
            sql.NVarChar(sql.MAX),
            notes || ''
          )

          .query(`
            INSERT INTO Orders (

              OrderCode,
              CoordinatorId,
              SourceStationId,
              DestinationStationId,
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
              @TotalAmount,
              @Notes,
              'Pending Approval',
              GETDATE(),
              GETDATE()

            );

            SELECT SCOPE_IDENTITY() AS OrderId;
          `)

      const orderId =
        result.recordset[0].OrderId

      for (const item of items) {

        await pool.request()

          .input(
            'OrderId',
            sql.Int,
            orderId
          )

          .input(
            'ProductId',
            sql.Int,
            item.productId
          )

          .input(
            'Quantity',
            sql.Float,
            item.quantity
          )

          .input(
            'UnitPrice',
            sql.Decimal(18, 2),
            item.unitPrice
          )

          .query(`
            INSERT INTO OrderItems (

              OrderId,
              ProductId,
              Quantity,
              UnitPrice,
              CreatedAt

            )
            VALUES (

              @OrderId,
              @ProductId,
              @Quantity,
              @UnitPrice,
              GETDATE()

            )
          `)

      }

      res.json({
        message: 'Tạo đơn thành công',
        orderId,
        orderCode
      })

    } catch (err) {

      console.error(
        '❌ CreateOrder Error:',
        err
      )

      res.status(500).json({
        error: err.message
      })

    }

  }

  // ================= GET PRODUCTS =================
  static async getProducts(req, res) {

    try {

      const products =
        await ProductModel.findAll()

      res.json(products)

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= GET MY ORDERS =================
  static async getMyOrders(req, res) {

    try {

      const orders =
        await OrderModel.findByCoordinator(
          req.user.Id
        )

      res.json(orders)

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= GET PENDING =================
  static async getPendingApprovalOrders(req, res) {

    try {

      const orders =
        await OrderModel.findPendingApproval()

      res.json(orders)

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= GET ALL =================
  static async getAllOrders(req, res) {

    try {

      const orders =
        await OrderModel.findAll()

      res.json(orders)

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= GET BY ID =================
  static async getOrderById(req, res) {

    try {

      const orderId =
        parseInt(req.params.orderId)

      const order =
        await OrderModel.findById(orderId)

      if (!order) {

        return res.status(404).json({
          error: 'Order not found'
        })

      }

      const items =
        await OrderItemModel.findByOrderId(
          orderId
        )

      res.json({
        ...order,
        items
      })

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= UPDATE STATUS =================
  static async updateStatus(req, res) {

    try {

      const orderId =
        parseInt(req.params.orderId)

      const { status } = req.body

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

        return res.status(400).json({
          error: 'Invalid status'
        })

      }

      const success =
        await OrderModel.updateStatus(
          orderId,
          status,
          req.user.Id
        )

      if (!success) {

        return res.status(404).json({
          error: 'Order not found'
        })

      }

      res.json({
        message:
          'Cập nhật trạng thái thành công'
      })

    } catch (error) {

      console.error(
        '❌ updateStatus ERROR:',
        error
      )

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= APPROVE =================
  static async approveOrder(req, res) {

    try {

      const orderId =
        parseInt(req.params.orderId)

      const pool =
        await getConnection()

      // =========================
      // UPDATE STATUS
      // =========================
      await OrderModel.updateStatus(
        orderId,
        'Approved',
        req.user.Id
      )

      // =========================
      // GET ORDER INFO
      // =========================
      const orderResult =
        await pool.request()

          .input(
            'OrderId',
            sql.Int,
            orderId
          )

          .query(`
            SELECT
              Id,
              OrderCode,
              DestinationStationId
            FROM Orders
            WHERE Id = @OrderId
          `)

      const order =
        orderResult.recordset[0]

      if (!order) {

        return res.status(404).json({
          error: 'Order not found'
        })

      }

      // =========================
      // FIND STATION USER
      // =========================
      const stationUserResult =
        await pool.request()

          .input(
            'StationId',
            sql.Int,
            order.DestinationStationId
          )

          .query(`
            SELECT TOP 1 Id
            FROM Users
            WHERE StationId = @StationId
            AND Role = 'Station'
          `)

      const stationUser =
        stationUserResult.recordset[0]

      if (!stationUser) {

        return res.status(404).json({
          error:
            'Không tìm thấy user của trạm'
        })

      }

      // =========================
      // SAVE NOTIFICATION
      // =========================
      await pool.request()

        .input(
          'ReceiverId',
          sql.Int,
          stationUser.Id
        )

        .input(
          'StationId',
          sql.Int,
          order.DestinationStationId
        )

        .input(
          'NotificationType',
          sql.NVarChar,
          'ORDER_APPROVED'
        )

        .input(
          'Title',
          sql.NVarChar,
          'Đơn hàng mới'
        )

        .input(
          'Message',
          sql.NVarChar,
          `Đơn hàng ${order.OrderCode}
           đã được kế toán duyệt`
        )

        .input(
          'RelatedOrderId',
          sql.Int,
          order.Id
        )

        .query(`
          INSERT INTO Notifications (

            ReceiverId,
            StationId,
            NotificationType,
            Title,
            Message,
            RelatedOrderId,
            IsRead,
            CreatedAt

          )
          VALUES (

            @ReceiverId,
            @StationId,
            @NotificationType,
            @Title,
            @Message,
            @RelatedOrderId,
            0,
            GETDATE()

          )
        `)

      // =========================
      // SOCKET REALTIME
      // =========================
      const io =
        req.app.get('io')

      io.to(
        `station_${order.DestinationStationId}`
      ).emit('order_approved', {

        stationId:
          order.DestinationStationId,

        title: 'Đơn hàng mới',

        message:
          `Đơn hàng ${order.OrderCode}
           đã được kế toán duyệt`

      })

      res.json({
        message: 'Đã phê duyệt'
      })

    } catch (error) {

      console.error(
        'approveOrder ERROR:',
        error
      )

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= REJECT =================
  static async rejectOrder(req, res) {

    try {

      const orderId =
        parseInt(req.params.orderId)

      await OrderModel.updateStatus(
        orderId,
        'Rejected',
        req.user.Id
      )

      res.json({
        message: 'Đã từ chối'
      })

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= CONFIRM PAYMENT =================
  static async confirmPayment(req, res) {

    try {

      res.json({
        message:
          'Đã xác nhận thanh toán (demo)'
      })

    } catch (error) {

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= GET STATION ORDERS =================
  static async getStationOrders(req, res) {

    try {

      const pool =
        await getConnection()

      const result =
        await pool.request()

          .input(
            'StationId',
            sql.Int,
            req.user.StationId
          )

          .query(`
            SELECT *
            FROM Orders
            WHERE DestinationStationId = @StationId
            ORDER BY CreatedAt DESC
          `)

      res.json(result.recordset)

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= GET STATIONS =================
  static async getStations(req, res) {

    try {

      const stations =
        await StationModel.findAll()

      res.json(stations)

    } catch (error) {

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= EXPORT =================
  static async exportOrdersReport(req, res) {

    try {

      const orders =
        await OrderModel.findAll()

      res.json(orders)

    } catch (error) {

      res.status(500).json({
        error: error.message
      })

    }

  }

  // ================= ACCOUNTING ORDERS =================
  static async getAccountingOrders(req, res) {

    try {

      const pool =
        await getConnection()

      const result =
        await pool.request().query(`
          SELECT

            o.Id,
            o.OrderCode,
            o.TotalAmount,
            o.OrderStatus,
            o.CreatedAt,

            s.StationName
              AS DestinationStation,

            u.FullName
              AS CoordinatorName

          FROM Orders o

          LEFT JOIN Stations s
            ON o.DestinationStationId = s.Id

          LEFT JOIN Users u
            ON o.CoordinatorId = u.Id

          ORDER BY o.CreatedAt DESC
        `)

      res.json(result.recordset)

    } catch (error) {

      console.error(
        'getAccountingOrders ERROR:',
        error
      )

      res.status(500).json({
        error: 'Lỗi server'
      })

    }

  }

}

module.exports = OrderController