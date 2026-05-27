const { getConnection, sql } =
  require('../config/database')

class CustomerDebtModel {

  static async findByCustomerCode(code) {

    const pool = await getConnection()

    const result = await pool.request()
      .input(
        'CustomerCode',
        sql.NVarChar,
        code
      )
      .query(`
        SELECT *
        FROM CustomerDebts
        WHERE CustomerCode = @CustomerCode
      `)

    return result.recordset[0]
  }

  static async findByCustomerName(name) {

    const pool = await getConnection()

    const result = await pool.request()
      .input(
        'CustomerName',
        sql.NVarChar,
        name
      )
      .query(`
        SELECT *
        FROM CustomerDebts
        WHERE CustomerName = @CustomerName
      `)

    return result.recordset[0]
  }

  static async increaseDebt(
    customerName,
    amount
  ) {

    const pool = await getConnection()

    await pool.request()
      .input(
        'CustomerName',
        sql.NVarChar,
        customerName
      )
      .input(
        'Amount',
        sql.Decimal(18,2),
        amount
      )
      .query(`
        UPDATE CustomerDebts

        SET
          DebtAmount =
            ISNULL(DebtAmount,0)
            + @Amount,

          UpdatedAt = GETDATE()

        WHERE CustomerName =
          @CustomerName
      `)
  }

  static async getAll() {

    const pool = await getConnection()

    const result = await pool.request()
      .query(`
        SELECT *
        FROM CustomerDebts
        ORDER BY CustomerName
      `)

    return result.recordset
  }

  /**
   * Đảm bảo bảng CustomerDebts có đủ cột cần thiết.
   * - Nếu bảng chưa tồn tại → tạo mới
   * - Nếu bảng đã tồn tại nhưng thiếu cột → ALTER TABLE thêm cột
   * Chạy tự động 1 lần khi server start.
   */
  static async ensureColumns() {
    const pool = await getConnection()

    // 1. Kiểm tra bảng CustomerDebts có tồn tại không
    const tableCheck = await pool.request().query(`
      SELECT *
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'CustomerDebts'
    `)

    if (tableCheck.recordset.length === 0) {
      // Bảng chưa tồn tại → tạo mới với đầy đủ cột
      console.log('📝 Creating CustomerDebts table...')
      await pool.request().query(`
        CREATE TABLE CustomerDebts (
          Id            INT IDENTITY(1,1) PRIMARY KEY,
          CustomerCode  NVARCHAR(50) NULL,
          CustomerName  NVARCHAR(255) NOT NULL,
          DebtAmount    FLOAT NULL DEFAULT 0,
          CreditAmount  FLOAT NULL DEFAULT 0,
          DebtLimit     FLOAT NULL DEFAULT 0,
          CreatedAt     DATETIME NULL DEFAULT GETDATE(),
          UpdatedAt     DATETIME NULL DEFAULT GETDATE()
        )
      `)
      console.log('✅ Created CustomerDebts table with all columns')
      return
    }

    // 2. Bảng đã tồn tại → kiểm tra và thêm cột còn thiếu
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'CustomerDebts'
    `)

    const existingCols = columns.recordset.map(r => r.COLUMN_NAME.toLowerCase())

    // Danh sách cột cần có (ngoại trừ Id, CreatedAt, UpdatedAt thường đã có)
    const requiredColumns = [
      { name: 'CustomerCode', type: 'NVARCHAR(50) NULL' },
      { name: 'CustomerName', type: 'NVARCHAR(255) NOT NULL DEFAULT N\'\'' },
      { name: 'DebtAmount', type: 'FLOAT NULL DEFAULT 0' },
      { name: 'CreditAmount', type: 'FLOAT NULL DEFAULT 0' },
      { name: 'DebtLimit', type: 'FLOAT NULL DEFAULT 0' },
      { name: 'CreatedAt', type: 'DATETIME NULL DEFAULT GETDATE()' },
      { name: 'UpdatedAt', type: 'DATETIME NULL DEFAULT GETDATE()' }
    ]

    for (const col of requiredColumns) {
      if (!existingCols.includes(col.name.toLowerCase())) {
        try {
          await pool.request().query(`
            ALTER TABLE CustomerDebts
            ADD ${col.name} ${col.type}
          `)
          console.log(`✅ Added column ${col.name} to CustomerDebts`)
        } catch (err) {
          console.error(`❌ Failed to add column ${col.name}:`, err.message)
        }
      }
    }

    // 3. Tạo index cho CustomerCode nếu chưa có
    try {
      await pool.request().query(`
        CREATE INDEX IX_CustomerDebts_CustomerCode
        ON CustomerDebts (CustomerCode)
      `)
      console.log('✅ Created index on CustomerCode')
    } catch (err) {
      // Index đã tồn tại, bỏ qua
    }
  }

}

module.exports =
  CustomerDebtModel
