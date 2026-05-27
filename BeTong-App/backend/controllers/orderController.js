const fs = require('fs')
const path = require('path')
const OrderModel = require('../models/Order')
const OrderDocumentModel = require('../models/OrderDocument')
const OrderItemModel = require('../models/OrderItem')
const ProductModel = require('../models/Product')
const StationModel = require('../models/Station')
const { getConnection, sql } = require('../config/database')
const NotificationService = require('../services/notificationService')
const CustomerDebtModel = require('../models/CustomerDebt')

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
      const { status, reason, forceApprove } = req.body

      const allowedStatuses = [
        'Draft',
        'Pending Approval',
        'Approved',
        'Rejected',
        'Processing',
        'Delivering',
        'Completed',
        'Cancelled',
        'Rejected'
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
        'Pending Approval': ['Approved', 'Rejected', 'Cancelled'],
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
          'Pending Approval': ['Approved', 'Rejected', 'Cancelled']
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

      // =========================
      // ✅ FIX 1: KIỂM TRA CÔNG NỢ TRƯỚC KHI DUYỆT
      // Nếu vượt hạn mức VÀ chưa forceApprove → trả cảnh báo (409)
      // Nếu vượt hạn mức VÀ forceApprove=true → vẫn duyệt (khách quen)
      // =========================
      if (status === 'Approved') {
        const debt = await CustomerDebtModel.findByCustomerName(order.CustomerName)

        const currentDebtAmount = debt ? Number(debt.DebtAmount || 0) : 0
        const debtLimit = debt ? Number(debt.DebtLimit || 0) : 0
        const futureDebt = currentDebtAmount + Number(order.TotalAmount || 0)

        // Nếu khách đã có record công nợ VÀ vượt hạn mức
        if (debt && futureDebt > debtLimit) {
          // Nếu user chưa xác nhận forceApprove → trả cảnh báo, KHÔNG thay đổi trạng thái đơn
          if (!forceApprove) {
            return res.status(409).json({
              debtWarning: true,
              error: `Khách hàng ${order.CustomerName} đang có công nợ vượt hạn mức`,
              details: {
                customerName: order.CustomerName,
                currentDebt: currentDebtAmount,
                orderTotal: Number(order.TotalAmount || 0),
                futureDebt,
                debtLimit
              }
            })
          }

          // Nếu forceApprove=true → user đã xác nhận, cho phép duyệt bất chấp vượt nợ
          // Ghi nhận lý do duyệt bất chấp vào reason
          const forceReason = reason
            ? `${reason} (Duyệt bất chấp vượt công nợ: Nợ ${currentDebtAmount.toLocaleString()} đ + Đơn ${Number(order.TotalAmount).toLocaleString()} đ > Hạn mức ${debtLimit.toLocaleString()} đ)`
            : `Duyệt bất chấp vượt công nợ: Nợ ${currentDebtAmount.toLocaleString()} đ + Đơn ${Number(order.TotalAmount).toLocaleString()} đ > Hạn mức ${debtLimit.toLocaleString()} đ`

          // ✅ SAU khi check xong mới cập nhật status (với lý do force approve)
          const updated = await OrderModel.updateStatus(
            orderId,
            status,
            req.user.Id,
            forceReason
          )
          if (!updated) {
            return res.status(500).json({ error: 'Failed to update status' })
          }

          const io = req.app.get('io')
          const statusMessage = `Đơn hàng ${order.OrderCode} đã chuyển sang trạng thái ${status}.`

          try {
            // Tăng công nợ khách hàng khi duyệt đơn (bất chấp)
            
            await NotificationService.notifyStationUsers(
              io,
              order.DestinationStationId,
              'OrderApproved',
              'Đơn hàng đã được duyệt',
              statusMessage,
              order.Id
            )
          } catch (notifyError) {
            console.error('Failed to send status update notifications:', notifyError)
          }

          return res.json({
            message: 'Updated (force approved despite debt limit)',
            status,
            forceApproved: true
          })
        }
      }

      // ✅ SAU khi check nợ xong (hoặc không vượt nợ) → cập nhật status bình thường
      const updated = await OrderModel.updateStatus(
        orderId,
        status,
        req.user.Id,
        reason || null
      )
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
          // Tăng công nợ khách hàng khi duyệt đơn
         
          await NotificationService.notifyStationUsers(
            io,
            order.DestinationStationId,
            'OrderApproved',
            'Đơn hàng đã được duyệt',
            statusMessage,
            order.Id
          )
        }
        if (status === 'Rejected' && order.CoordinatorId) {
          await NotificationService.sendUserNotification(
            io,
            order.CoordinatorId,
            'OrderRejected',
            'Đơn hàng đã bị từ chối',
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

  // ✅ getAccountingOrders thêm DebtDueDate
  static async getAccountingOrders(req, res) {
  try {
    const pool = await getConnection()

    const result = await pool.request().query(`
  SELECT 
    o.Id,
    o.OrderCode,
    o.CustomerName,
    o.TotalAmount,
    o.OrderStatus,
    o.CreatedAt,
    o.PaymentStatus,
    o.DebtDueDate,
    s.StationName AS DestinationStation,
    u.FullName AS CoordinatorName,
    cd.DebtAmount,
    cd.DebtLimit
  FROM Orders o
  LEFT JOIN Stations s
    ON o.DestinationStationId = s.Id
  LEFT JOIN Users u
    ON o.CoordinatorId = u.Id
  LEFT JOIN CustomerDebts cd
    ON o.CustomerName = cd.CustomerName
  ORDER BY o.CreatedAt DESC
`)

    res.json(result.recordset)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}

  static async getEngineerOrders(req, res) {
    try {
      const orders = req.user.StationId
        ? await OrderModel.findByStation(req.user.StationId)
        : await OrderModel.findAll()

      res.json(orders)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  }

  static async getStationOrders(req, res) {
    const pool = await getConnection()
    const result = await pool.request()
      .input('stationId', sql.Int, req.user.StationId)
      .query(`
        SELECT
          o.Id,
          o.OrderCode,
          o.TotalAmount,
          o.OrderStatus,
          o.CreatedAt,
          s.StationName AS DestinationStation,
          u.FullName AS CoordinatorName
        FROM Orders o
        LEFT JOIN Stations s
          ON o.DestinationStationId = s.Id
        LEFT JOIN Users u
          ON o.CoordinatorId = u.Id
        WHERE o.DestinationStationId = @stationId
        ORDER BY o.CreatedAt DESC
      `)
    res.json(result.recordset)
  }

  static async getUploadedDocuments(req, res) {
    try {
      const orderId = Number(req.params.orderId)

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ error: 'Invalid orderId' })
      }

      const order = await OrderModel.findById(orderId)

      if (!order) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const documents = await OrderDocumentModel.findByOrderId(orderId)

      res.json(documents)
    } catch (error) {
      console.error('getUploadedDocuments error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async uploadDocuments(req, res) {
    try {
      const orderId = Number(req.params.orderId)

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ error: 'Invalid orderId' })
      }

      const order = await OrderModel.findById(orderId)

      if (!order) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const files = req.files || []

      if (!files.length) {
        return res.status(400).json({ error: 'At least one file is required' })
      }

      await OrderDocumentModel.ensureTable()

      const uploadDir = path.join(__dirname, '..', 'uploads', 'order-documents', String(orderId))
      await fs.promises.mkdir(uploadDir, { recursive: true })

      const savedFiles = await Promise.all(
        files.map(async (file) => {
          const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${path.basename(file.originalname)}`
          const filePath = path.join(uploadDir, safeName)
          await fs.promises.writeFile(filePath, file.buffer)

          const url = `/uploads/order-documents/${orderId}/${encodeURIComponent(safeName)}`
          const document = {
            fileName: safeName,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url,
            path: url,
          }

          const documentId = await OrderDocumentModel.create(orderId, document, req.user.Id)

          return {
            id: documentId,
            originalName: document.originalName,
            mimeType: document.mimeType,
            size: document.size,
            url: document.url,
            path: document.path,
            uploadedAt: new Date().toISOString(),
          }
        })
      )

      res.status(201).json({
        message: 'Documents uploaded successfully',
        orderId,
        files: savedFiles,
      })
    } catch (error) {
      console.error('uploadDocuments error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  static async deleteUploadedDocument(req, res) {
  try {
    const orderId = Number(req.params.orderId)
    const documentId = Number(req.params.documentId)

    if (
      !Number.isInteger(orderId) ||
      !Number.isInteger(documentId)
    ) {
      return res.status(400).json({
        error: 'Invalid id'
      })
    }

    const order = await OrderModel.findById(orderId)

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      })
    }

    const documents =
      await OrderDocumentModel.findByOrderId(orderId)

    const document = documents.find(
      d => Number(d.id || d.Id) === documentId
    )

    if (!document) {
      return res.status(404).json({
        error: 'Document not found'
      })
    }

    // xóa file vật lý
    try {
      const relativePath =
        decodeURIComponent(
          document.path || document.Path || ''
        )

      const fullPath = path.join(
        __dirname,
        '..',
        relativePath
      )

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath)
      }
    } catch (fileErr) {
      console.error('Delete file error:', fileErr)
    }

    // xóa database
    const pool = await getConnection()

    await pool.request()
      .input('DocumentId', sql.Int, documentId)
      .query(`
        DELETE FROM OrderDocuments
        WHERE Id = @DocumentId
      `)

    return res.json({
      message: 'Document deleted successfully'
    })

  } catch (error) {
    console.error(
      'deleteUploadedDocument error:',
      error
    )

    res.status(500).json({
      error: error.message
    })
  }
}

  static async exportOrdersReport(req, res) {
    const orders = await OrderModel.findAll()
    res.json(orders)
  }

// ================= UPLOAD PAYMENT DOCUMENT =================

static async uploadPaymentDocument(req, res) {

  try {

    const { id } = req.params

    if (!req.file) {

      return res.status(400).json({
        error: 'Chưa chọn file'
      })

    }

    const filePath =
      `/uploads/order-documents/${req.file.filename}`

    const pool =
      await getConnection()

    await pool.request()

      .input(
        'Id',
        sql.Int,
        id
      )

      .input(
        'UploadDocument',
        sql.NVarChar,
        filePath
      )

      .query(`

        UPDATE Orders

        SET

          UploadDocument =
            @UploadDocument,

          UploadedByEngineerAt =
            GETDATE()

        WHERE Id = @Id

      `)

    res.json({

      message:
        'Upload thành công',

      filePath

    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

}

// ================= SEND ACCOUNTING =================

static async sendToAccounting(req, res) {

  try {

    const { id } = req.params

    const pool =
      await getConnection()

    await pool.request()

      .input(
        'Id',
        sql.Int,
        id
      )

      .query(`

        UPDATE Orders

        SET

          PaymentStatus =
            'WaitingConfirmation',

          SentToAccountingAt =
            GETDATE()

        WHERE Id = @Id

      `)

    res.json({

      message:
        'Đã gửi kế toán'

    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

}

// ================= WAITING PAYMENTS =================

static async getWaitingPayments(req, res) {

  try {

    const pool =
      await getConnection()

    const result =
      await pool.request()

      .query(`

        SELECT *
        FROM Orders

        WHERE PaymentStatus =
          'WaitingConfirmation'

        ORDER BY
          SentToAccountingAt DESC

      `)

    res.json(result.recordset)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

}

// ✅ CONFIRM PAYMENT - Hỗ trợ Trả hết hoặc Ghi công nợ
static async confirmPayment(req, res) {

  try {

    const orderId =
      req.params.orderId ?? req.params.id

    const { paymentType, debtDueDate } = req.body

    if (!orderId) {
      return res.status(400).json({
        error: 'Thiếu mã đơn hàng'
      })
    }

    const pool =
      await getConnection()

    // Nếu chọn Ghi công nợ
    if (paymentType === 'debt') {

      if (!debtDueDate) {
        return res.status(400).json({
          error: 'Vui lòng nhập hạn trả công nợ'
        })
      }

      await pool.request()
        .input('Id', sql.Int, Number(orderId))
        .input('DebtDueDate', sql.DateTime, new Date(debtDueDate))
        .query(`

          UPDATE Orders

          SET
            PaymentStatus = 'Debt',
            DebtDueDate = @DebtDueDate,
            PaymentConfirmedAt = GETDATE()

          WHERE Id = @Id

        `)
              // ✅ Cộng công nợ khi chọn ghi công nợ
      try {

        const order =
          await OrderModel.findById(
            Number(orderId)
          )

        if (
          order &&
          order.CustomerName &&
          order.TotalAmount
        ) {

          await CustomerDebtModel.increaseDebt(
            order.CustomerName,
            order.TotalAmount
          )

        }

      } catch (debtErr) {

        console.error(
          'Failed to increase customer debt:',
          debtErr
        )

      }

      res.json({
        message: 'Đã ghi công nợ'
      })

    } else {

      // Trả hết (mặc định) - giống logic cũ
      await pool.request()
        .input('Id', sql.Int, Number(orderId))
        .query(`

          UPDATE Orders

          SET

            PaymentStatus =
              'Paid',

            PaymentConfirmedAt =
              GETDATE(),

            DebtDueDate = NULL

          WHERE Id = @Id

        `)

      // Giảm công nợ khách hàng khi trả hết
      try {
        const order = await OrderModel.findById(Number(orderId))
        if (order && order.CustomerName && order.TotalAmount) {
          await CustomerDebtModel.decreaseDebt(
            order.CustomerName,
            order.TotalAmount
          )
        }
      } catch (debtErr) {
        console.error('Failed to decrease customer debt:', debtErr)
        // Không rollback - thanh toán vẫn thành công
      }

      res.json({

        message:
          'Đã xác nhận thanh toán'

      })

    }

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

}

// ✅ CONFIRM DEBT PAYMENT - Thanh toán công nợ (khi khách trả nợ)
static async confirmDebtPayment(req, res) {

  try {

    const orderId =
      req.params.orderId ?? req.params.id

    if (!orderId) {
      return res.status(400).json({
        error: 'Thiếu mã đơn hàng'
      })
    }

    // Kiểm tra đơn hàng có ở trạng thái công nợ không
    const order = await OrderModel.findById(Number(orderId))

    if (!order) {
      return res.status(404).json({
        error: 'Không tìm thấy đơn hàng'
      })
    }

    if (order.PaymentStatus !== 'Debt') {
      return res.status(400).json({
        error: 'Đơn hàng không ở trạng thái công nợ'
      })
    }

    const pool =
      await getConnection()

    await pool.request()
      .input('Id', sql.Int, Number(orderId))
      .query(`

        UPDATE Orders

        SET

          PaymentStatus =
            'Paid',

          PaymentConfirmedAt =
            GETDATE(),

          DebtDueDate = NULL

        WHERE Id = @Id

      `)

    // Giảm công nợ khách hàng
    try {
      if (order.CustomerName && order.TotalAmount) {
        await CustomerDebtModel.decreaseDebt(
          order.CustomerName,
          order.TotalAmount
        )
      }
    } catch (debtErr) {
      console.error('Failed to decrease customer debt:', debtErr)
    }

    res.json({
      message: 'Đã thanh toán công nợ'
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

}

// ================= REJECT PAYMENT =================

static async rejectPayment(req, res) {

  try {

    const { id } = req.params

    const { reason } = req.body

    const pool =
      await getConnection()

    await pool.request()

      .input(
        'Id',
        sql.Int,
        id
      )

      .input(
        'Reason',
        sql.NVarChar,
        reason
      )

      .query(`

        UPDATE Orders

        SET

          PaymentStatus =
            'Rejected',

          PaymentRejectReason =
            @Reason

        WHERE Id = @Id

      `)

    res.json({

      message:
        'Đã từ chối'

    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

}
 
}


module.exports = OrderController
