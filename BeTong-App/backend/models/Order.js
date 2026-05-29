const { getConnection, sql } = require('../config/database')

class OrderModel {

  // ================= GET ORDERS BY COORDINATOR =================
  static async findByCoordinator(coordinatorId, limit = 50, offset = 0) {

    const pool = await getConnection()

    const result = await pool.request()
      .input('CoordinatorId', sql.Int, coordinatorId)
      .input('Limit', sql.Int, limit)
      .input('Offset', sql.Int, offset)

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

          s1.StationName AS SourceStation,
          s2.StationName AS DestinationStation,

          ISNULL(o.TotalAmount, o.Volume * o.Price) AS TotalAmount,

          o.OrderStatus,

          o.RejectReason,

          o.AdditionalCosts,
          o.TransportCompVolume,
          o.TransportCompAmount,

          o.CreatedAt

        FROM Orders o

        LEFT JOIN Stations s1 
          ON o.SourceStationId = s1.Id

        LEFT JOIN Stations s2 
          ON o.DestinationStationId = s2.Id

        WHERE o.CoordinatorId = @CoordinatorId

        ORDER BY o.CreatedAt DESC

        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY
      `)

    return result.recordset
  }

  // ================= GET ALL ORDERS =================
  static async findAll(limit = 50, offset = 0) {

    const pool = await getConnection()

    const result = await pool.request()
      .input('Limit', sql.Int, limit)
      .input('Offset', sql.Int, offset)

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

          s1.StationName AS SourceStation,
          s2.StationName AS DestinationStation,

          ISNULL(o.TotalAmount, o.Volume * o.Price) AS TotalAmount,

          o.OrderStatus,

          o.RejectReason,

          o.AdditionalCosts,
          o.TransportCompVolume,
          o.TransportCompAmount,

          o.CreatedAt

        FROM Orders o

        LEFT JOIN Stations s1 
          ON o.SourceStationId = s1.Id

        LEFT JOIN Stations s2 
          ON o.DestinationStationId = s2.Id

        ORDER BY o.CreatedAt DESC

        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY
      `)

    return result.recordset
  }

  // ================= GET ORDER BY ID =================
  static async findById(orderId) {

    const pool = await getConnection()

    const result = await pool.request()
      .input('OrderId', sql.Int, orderId)

      .query(`
        SELECT 
          o.*,

          s1.StationName AS SourceStation,
          s2.StationName AS DestinationStation

        FROM Orders o

        LEFT JOIN Stations s1 
          ON o.SourceStationId = s1.Id

        LEFT JOIN Stations s2 
          ON o.DestinationStationId = s2.Id

        WHERE o.Id = @OrderId
      `)

    return result.recordset[0]
  }

  // ================= UPDATE STATUS =================
  static async updateStatus(
    orderId,
    status,
    updatedBy,
    rejectReason = null
  ) {

    const pool = await getConnection()

    const result = await pool
      .request()

      .input('orderId', sql.Int, orderId)
      .input('status', sql.NVarChar, status)
      .input('updatedBy', sql.Int, updatedBy)
      .input(
        'rejectReason',
        sql.NVarChar(sql.MAX),
        rejectReason
      )

      .query(`
        UPDATE Orders

        SET
          OrderStatus = @status,

          -- ✅ CHỈ LƯU LÝ DO KHI REJECT
          RejectReason =
            CASE
              WHEN @status = 'Rejected'
              THEN @rejectReason
              ELSE NULL
            END,

          UpdatedAt = GETDATE()

        WHERE Id = @orderId
      `)

    return result.rowsAffected[0] > 0
  }

  // ================= PENDING APPROVAL =================
  static async findPendingApproval(limit = 50, offset = 0) {

    const pool = await getConnection()

    const result = await pool.request()
      .input('Limit', sql.Int, limit)
      .input('Offset', sql.Int, offset)

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

          s1.StationName AS SourceStation,
          s2.StationName AS DestinationStation,

          ISNULL(o.TotalAmount, o.Volume * o.Price) AS TotalAmount,

          o.OrderStatus,

          o.RejectReason,

          o.AdditionalCosts,
          o.TransportCompVolume,
          o.TransportCompAmount,

          o.CreatedAt

        FROM Orders o

        LEFT JOIN Stations s1 
          ON o.SourceStationId = s1.Id

        LEFT JOIN Stations s2 
          ON o.DestinationStationId = s2.Id

        WHERE o.OrderStatus = 'Pending Approval'

        ORDER BY o.CreatedAt DESC

        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY
      `)

    return result.recordset
  }

  // ================= GET ORDERS BY STATION =================
  static async findByStation(stationId) {

    const pool = await getConnection()

    const result = await pool.request()
      .input('StationId', stationId)

      .query(`
        SELECT 
          o.*,

          u.FullName AS CoordinatorName,

          s2.StationName AS DestinationStation

        FROM Orders o

        LEFT JOIN Users u 
          ON o.CoordinatorId = u.Id

        LEFT JOIN Stations s2 
          ON o.DestinationStationId = s2.Id

        WHERE o.DestinationStationId = @StationId

        ORDER BY o.CreatedAt DESC
      `)

    return result.recordset
  }

  // ================= ✅ MỚI: TÍNH BÙ VẬN CHUYỂN THEO NGÀY/KHÁCH HÀNG =================
  // Lấy tổng khối lượng bê tông của 1 khách hàng trong 1 ngày
  static async getDayVolumeByCustomer(customerName, deliveryDate) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('CustomerName', sql.NVarChar, customerName)
      .input('DeliveryDate', sql.Date, deliveryDate)

      .query(`
        SELECT 
          SUM(ISNULL(o.Volume, 0)) AS TotalVolume,
          COUNT(*) AS OrderCount
        FROM Orders o
        WHERE o.CustomerName = @CustomerName
          AND CAST(o.DeliveryTime AS DATE) = @DeliveryDate
          AND o.OrderStatus NOT IN ('Cancelled', 'Rejected')
      `)

    return result.recordset[0]
  }

  // ================= ✅ MỚI: CẬP NHẬT BÙ VẬN CHUYỂN CHO ĐƠN =================
  static async updateTransportCompensation(orderId, transportCompVolume, transportCompAmount) {
    const pool = await getConnection()

    await pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('TransportCompVolume', sql.Float, transportCompVolume)
      .input('TransportCompAmount', sql.Decimal(18, 2), transportCompAmount)

      .query(`
        UPDATE Orders
        SET
          TransportCompVolume = @TransportCompVolume,
          TransportCompAmount = @TransportCompAmount,
          UpdatedAt = GETDATE()
        WHERE Id = @OrderId
      `)
  }

  // ================= ✅ MỚI: CẬP NHẬT CHI PHÍ PHÁT SINH =================
  static async updateAdditionalCosts(orderId, additionalCosts) {
    const pool = await getConnection()

    await pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('AdditionalCosts', sql.Decimal(18, 2), additionalCosts)

      .query(`
        UPDATE Orders
        SET
          AdditionalCosts = @AdditionalCosts,
          UpdatedAt = GETDATE()
        WHERE Id = @OrderId
      `)
  }

}

module.exports = OrderModel
