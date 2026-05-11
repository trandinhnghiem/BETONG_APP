const { getConnection, sql } = require('../config/database')

class OrderItem {
  static async create(orderId, itemData) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('orderId', sql.Int, orderId)
      .input('productId', sql.Int, itemData.productId)
      .input('quantity', sql.Decimal(10, 2), itemData.quantity)
      .input('unitPrice', sql.Decimal(18, 2), itemData.unitPrice)
      .input('totalPrice', sql.Decimal(18, 2), itemData.quantity * itemData.unitPrice)
      .query(`
        INSERT INTO OrderItems (OrderId, ProductId, Quantity, UnitPrice, TotalPrice)
        OUTPUT INSERTED.Id
        VALUES (@orderId, @productId, @quantity, @unitPrice, @totalPrice)
      `)
    return result.recordset[0]
  }

  static async findByOrderId(orderId) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT oi.*, p.ProductName, p.UnitOfMeasure
        FROM OrderItems oi
        JOIN Products p ON oi.ProductId = p.Id
        WHERE oi.OrderId = @orderId
        ORDER BY oi.Id
      `)
    return result.recordset
  }

  static async update(orderId, productId, quantity) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('orderId', sql.Int, orderId)
      .input('productId', sql.Int, productId)
      .input('quantity', sql.Decimal(10, 2), quantity)
      .query(`
        UPDATE OrderItems
        SET Quantity = @quantity, TotalPrice = Quantity * UnitPrice, UpdatedAt = GETDATE()
        WHERE OrderId = @orderId AND ProductId = @productId
      `)
    return result.rowsAffected[0] > 0
  }

  static async delete(orderId, productId) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('orderId', sql.Int, orderId)
      .input('productId', sql.Int, productId)
      .query(`
        DELETE FROM OrderItems
        WHERE OrderId = @orderId AND ProductId = @productId
      `)
    return result.rowsAffected[0] > 0
  }
}

module.exports = OrderItem