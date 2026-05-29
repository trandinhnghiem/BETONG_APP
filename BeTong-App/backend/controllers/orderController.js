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

// ✅ Hằng số: Đơn tối thiểu (m³)
const MIN_VOLUME = 5

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

  // ================= ✅ TÍNH BÙ VẬN CHUYỂN =================
  // GET /api/orders/transport-compensation?customerName=xxx&deliveryDate=2024-01-15
  static async calculateTransportCompensation(req, res) {
    try {
      const { customerName, deliveryDate } = req.query

      if (!customerName || !deliveryDate) {
        return res.status(400).json({ error: 'Thiếu customerName hoặc deliveryDate' })
      }

      const dayInfo = await OrderModel.getDayVolumeByCustomer(customerName, deliveryDate)
      const totalVolume = Number(dayInfo.TotalVolume || 0)
      const orderCount = Number(dayInfo.OrderCount || 0)

      let transportCompVolume = 0
      let needsCompensation = false

      if (totalVolume < MIN_VOLUME) {
        transportCompVolume = MIN_VOLUME - totalVolume
        needsCompensation = true
      }

      res.json({
        customerName,
        deliveryDate,
        totalVolume,
        orderCount,
        minVolume: MIN_VOLUME,
        needsCompensation,
        transportCompVolume,
        message: needsCompensation
          ? `Tổng KL ${totalVolume}m³ < Đơn tối thiểu ${MIN_VOLUME}m³ → Bù VC: ${transportCompVolume}m³`
          : `Tổng KL ${totalVolume}m³ >= Đơn tối thiểu ${MIN_VOLUME}m³ → Không bù VC`
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  // ================= ✅ CẬP NHẬT CHI PHÍ PHÁT SINH & BÙ VC =================
  // PUT /api/orders/:orderId/update-costs
  static async updateCosts(req, res) {
    try {
      const orderId = Number(req.params.orderId)
      const { additionalCosts, transportCompVolume, transportCompAmount } = req.body

      if (!orderId) {
        return res.status(400).json({ error: 'Thiếu mã đơn hàng' })
      }

      const order = await OrderModel.findById(orderId)
      if (!order) {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
      }

      // Cập nhật chi phí phát sinh
      if (additionalCosts !== undefined) {
        await OrderModel.updateAdditionalCosts(orderId, Number(additionalCosts) || 0)
      }

      // Cập nhật bù vận chuyển
      if (transportCompVolume !== undefined && transportCompAmount !== undefined) {
        await OrderModel.updateTransportCompensation(
          orderId,
          Number(transportCompVolume) || 0,
          Number(transportCompAmount) || 0
        )
      }

      // Tính lại TotalAmount = Volume * Price + AdditionalCosts + TransportCompAmount
      const pool = await getConnection()
      await pool.request()
        .input('OrderId', sql.Int, orderId)
        .query(`
          UPDATE Orders
          SET TotalAmount = 
              ISNULL(Volume, 0) * ISNULL(Price, 0)
              + ISNULL(AdditionalCosts, 0)
              + ISNULL(TransportCompAmount, 0),
              UpdatedAt = GETDATE()
          WHERE Id = @OrderId
        `)

      res.json({ message: 'Đã cập nhật chi phí' })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  // ================= CREATE ORDER =================
  static async createOrder(req, res) {
  try {
    console.log(req.body)

    const {
      mixingStationId,
      notes,
      items,

      customerName,
      address,
      phone,

      concreteType,
      volume,
      price,
      deliveryTime,

      technicalEngineer,
      pipeOperator,
      pipeInstaller,
      pouringInstructions,

      truck,

      // ✅ MỚI: Chi phí phát sinh & bù vận chuyển
      additionalCosts,
      transportCompVolume,
      transportCompAmount

    } = req.body
    

    if (!mixingStationId || !items?.length) {
      return res.status(400).json({ error: 'Invalid data' })
    }

    const pool = await getConnection()
    const orderCode = 'ORD-' + Date.now()

    const itemTotal = items.reduce((s, i) =>
      s + i.quantity * i.unitPrice, 0)

    // ✅ Tính TotalAmount bao gồm chi phí phát sinh + bù vận chuyển
    const addCosts = Number(additionalCosts) || 0
    const tCompVolume = Number(transportCompVolume) || 0
    const tCompAmount = Number(transportCompAmount) || 0
    const totalAmount = itemTotal + addCosts + tCompAmount

    const result = await pool.request()
      .input('OrderCode', sql.NVarChar, orderCode)
      .input('CoordinatorId', sql.Int, req.user.Id)
      .input('SourceStationId', sql.Int, mixingStationId)
      .input('DestinationStationId', sql.Int, mixingStationId)

      // ⭐ CUSTOMER INFO
      .input('CustomerName', sql.NVarChar, customerName)
      .input('Address', sql.NVarChar, address)
      .input('Phone', sql.NVarChar, phone)

      .input('ConcreteType', sql.NVarChar, concreteType)
      .input('Volume', sql.Float, Number(volume) || 0)
      .input('Price', sql.Decimal(18,2), Number(price) || 0)
      .input('DeliveryTime', sql.DateTime, deliveryTime)

      .input('Engineer', sql.NVarChar, technicalEngineer)
      .input('PipeHolder', sql.NVarChar, pipeOperator)
      .input('PipeFixer', sql.NVarChar, pipeInstaller)
      .input(
        'PouringVolume',
        sql.NVarChar,
        pouringInstructions
      )

      .input('Truck', sql.NVarChar, truck)

      // ✅ MỚI: Chi phí phát sinh & bù vận chuyển
      .input('AdditionalCosts', sql.Decimal(18,2), addCosts)
      .input('TransportCompVolume', sql.Float, tCompVolume)
      .input('TransportCompAmount', sql.Decimal(18,2), tCompAmount)

      .input('TotalAmount', sql.Decimal(18,2), Number(totalAmount) || 0)

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

          ConcreteType,
          Volume,
          Price,
          DeliveryTime,

          Engineer,
          PipeHolder,
          PipeFixer,
          PouringVolume,

          Truck,

          AdditionalCosts,
          TransportCompVolume,
          TransportCompAmount,

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

          @ConcreteType,
          @Volume,
          @Price,
          @DeliveryTime,

          @Engineer,
          @PipeHolder,
          @PipeFixer,
          @PouringVolume,

          @Truck,

          @AdditionalCosts,
          @TransportCompVolume,
          @TransportCompAmount,

          @TotalAmount,
          @Notes,

          'Draft',
          GETDATE(),
          GETDATE()
        )

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
      // =========================
      if (status === 'Approved') {
        const debt = await CustomerDebtModel.findByCustomerName(order.CustomerName)

        const currentDebtAmount = debt ? Number(debt.DebtAmount || 0) : 0
        const debtLimit = debt ? Number(debt.DebtLimit || 0) : 0
        const futureDebt = currentDebtAmount + Number(order.TotalAmount || 0)

        if (debt && futureDebt > debtLimit) {
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

          const forceReason = reason
            ? `${reason} (Duyệt bất chấp vượt công nợ: Nợ ${currentDebtAmount.toLocaleString()} đ + Đơn ${Number(order.TotalAmount).toLocaleString()} đ > Hạn mức ${debtLimit.toLocaleString()} đ)`
            : `Duyệt bất chấp vượt công nợ: Nợ ${currentDebtAmount.toLocaleString()} đ + Đơn ${Number(order.TotalAmount).toLocaleString()} đ > Hạn mức ${debtLimit.toLocaleString()} đ`

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

  // ✅ getAccountingOrders - Đầy đủ các cột mới
  static async getAccountingOrders(req, res) {
  try {
    const pool = await getConnection()

    const result = await pool.request().query(`
  SELECT 
    o.Id,
    o.OrderCode,
    o.CustomerName,
    o.Address,
    o.Phone,
    o.ConcreteType,
    o.Volume,
    o.Price,
    o.DeliveryTime,
    o.Engineer,
    o.PipeHolder,
    o.PipeFixer,
    o.Truck,

    ISNULL(o.TotalAmount, o.Volume * o.Price) AS TotalAmount,
    o.OrderStatus,
    o.CreatedAt,
    o.PaymentStatus,
    o.DebtDueDate,

    o.AdditionalCosts,
    o.TransportCompVolume,
    o.TransportCompAmount,

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

  const pool =
    await getConnection()

  const result =
    await pool.request()

      .input(
        'stationId',
        sql.Int,
        req.user.StationId
      )

      .query(`
        SELECT

          o.Id,
          o.OrderCode,

          o.CustomerName,
          o.Address,
          o.Phone,

          o.ConcreteType,
          o.Volume,
          o.Price,
          o.DeliveryTime,

          o.Engineer,
          o.PipeHolder,
          o.PipeFixer,
          o.PouringVolume,

          o.Truck,
          o.Notes,

          ISNULL(
            o.TotalAmount,
            o.Volume * o.Price
          ) AS TotalAmount,

          o.OrderStatus,

          o.RejectReason,

          o.AdditionalCosts,
          o.TransportCompVolume,
          o.TransportCompAmount,

          o.CreatedAt,

          s.StationName AS DestinationStation,

          u.FullName AS CoordinatorName

        FROM Orders o

        LEFT JOIN Stations s
          ON o.DestinationStationId = s.Id

        LEFT JOIN Users u
          ON o.CoordinatorId = u.Id

        WHERE
          o.DestinationStationId =
          @stationId

        ORDER BY
          o.CreatedAt DESC
      `)

  res.json(
    result.recordset
  )

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

    const { paymentType, debtDueDate, additionalCosts, transportCompVolume, transportCompAmount } = req.body

    if (!orderId) {
      return res.status(400).json({
        error: 'Thiếu mã đơn hàng'
      })
    }

    const pool =
      await getConnection()

    // ✅ Cập nhật chi phí phát sinh & bù vận chuyển nếu có
    if (additionalCosts !== undefined || transportCompVolume !== undefined) {
      const addCosts = Number(additionalCosts) || 0
      const tCompVolume = Number(transportCompVolume) || 0
      const tCompAmount = Number(transportCompAmount) || 0

      await pool.request()
        .input('Id', sql.Int, Number(orderId))
        .input('AdditionalCosts', sql.Decimal(18, 2), addCosts)
        .input('TransportCompVolume', sql.Float, tCompVolume)
        .input('TransportCompAmount', sql.Decimal(18, 2), tCompAmount)
        .query(`
          UPDATE Orders
          SET
            AdditionalCosts = @AdditionalCosts,
            TransportCompVolume = @TransportCompVolume,
            TransportCompAmount = @TransportCompAmount,
            TotalAmount = ISNULL(Volume, 0) * ISNULL(Price, 0) + @AdditionalCosts + @TransportCompAmount,
            UpdatedAt = GETDATE()
          WHERE Id = @Id
        `)
    }

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
