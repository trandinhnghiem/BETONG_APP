const { getConnection, sql } = require('../config/database')

class Product {
  static async findAll(limit = 100, offset = 0) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT Id, ProductCode, ProductName, Description, Category, UnitOfMeasure, UnitPrice, IsActive
        FROM Products
        WHERE IsActive = 1
        ORDER BY ProductName
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `)
    return result.recordset
  }

  static async findById(id) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT Id, ProductCode, ProductName, Description, Category, UnitOfMeasure, UnitPrice, IsActive
        FROM Products
        WHERE Id = @id AND IsActive = 1
      `)
    return result.recordset[0]
  }

  static async findByCategory(category) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('category', sql.NVarChar, category)
      .query(`
        SELECT Id, ProductCode, ProductName, Description, Category, UnitOfMeasure, UnitPrice, IsActive
        FROM Products
        WHERE Category = @category AND IsActive = 1
        ORDER BY ProductName
      `)
    return result.recordset
  }

  static async create(productData) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('productCode', sql.NVarChar, productData.productCode)
      .input('productName', sql.NVarChar, productData.productName)
      .input('description', sql.NVarChar, productData.description || null)
      .input('category', sql.NVarChar, productData.category || null)
      .input('unitOfMeasure', sql.NVarChar, productData.unitOfMeasure)
      .input('unitPrice', sql.Decimal(18, 2), productData.unitPrice)
      .query(`
        INSERT INTO Products (ProductCode, ProductName, Description, Category, UnitOfMeasure, UnitPrice)
        OUTPUT INSERTED.Id
        VALUES (@productCode, @productName, @description, @category, @unitOfMeasure, @unitPrice)
      `)
    return result.recordset[0]
  }

  static async update(id, productData) {
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('productName', sql.NVarChar, productData.productName)
      .input('description', sql.NVarChar, productData.description)
      .input('category', sql.NVarChar, productData.category)
      .input('unitOfMeasure', sql.NVarChar, productData.unitOfMeasure)
      .input('unitPrice', sql.Decimal(18, 2), productData.unitPrice)
      .input('isActive', sql.Bit, productData.isActive !== undefined ? productData.isActive : 1)
      .query(`
        UPDATE Products
        SET ProductName = @productName, Description = @description, Category = @category,
            UnitOfMeasure = @unitOfMeasure, UnitPrice = @unitPrice, IsActive = @isActive, UpdatedAt = GETDATE()
        WHERE Id = @id
      `)
    return result.rowsAffected[0] > 0
  }
}

module.exports = Product