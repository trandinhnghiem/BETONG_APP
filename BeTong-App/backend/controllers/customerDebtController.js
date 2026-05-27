const { getConnection, sql } =
  require('../config/database')

const CustomerDebtModel =
  require('../models/CustomerDebt')

// ================= GET =================

exports.getAllDebts = async (
  req,
  res
) => {

  try {

    const pool =
      await getConnection()

    const result =
      await pool.request().query(`

        SELECT
          Id,
          CustomerCode,
          CustomerName,
          DebtAmount,
          CreditAmount,
          DebtLimit,
          CreatedAt,
          UpdatedAt
        FROM CustomerDebts
        ORDER BY CustomerName

      `)

    res.json(result.recordset)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

}

// ================= CREATE =================

exports.createDebt = async (
  req,
  res
) => {

  try {

    const {
      customerCode,
      customerName,
      debtAmount,
      creditAmount,
      debtLimit
    } = req.body || {}

    if (
      customerName === undefined ||
      customerName === '' ||
      debtAmount === undefined ||
      debtLimit === undefined
    ) {

      return res.status(400).json({
        error: 'Thiếu dữ liệu'
      })

    }

    const pool =
      await getConnection()

    await pool.request()

      .input(
        'CustomerCode',
        sql.NVarChar(50),
        customerCode || null
      )

      .input(
        'CustomerName',
        sql.NVarChar(255),
        customerName
      )

      .input(
        'DebtAmount',
        sql.Float,
        Number(debtAmount)
      )

      .input(
        'CreditAmount',
        sql.Float,
        Number(creditAmount || 0)
      )

      .input(
        'DebtLimit',
        sql.Float,
        Number(debtLimit)
      )

      .query(`

        INSERT INTO CustomerDebts
        (
          CustomerCode,
          CustomerName,
          DebtAmount,
          CreditAmount,
          DebtLimit,
          CreatedAt,
          UpdatedAt
        )

        VALUES
        (
          @CustomerCode,
          @CustomerName,
          @DebtAmount,
          @CreditAmount,
          @DebtLimit,
          GETDATE(),
          GETDATE()
        )

      `)

    res.json({
      message:
        'Thêm khách hàng thành công'
    })

  } catch (error) {

    console.error(
      'CREATE ERROR:',
      error
    )

    res.status(500).json({
      error: error.message
    })

  }

}

// ================= UPDATE =================

exports.updateDebt = async (
  req,
  res
) => {

  try {

    const { id } = req.params

    const {
      customerCode,
      customerName,
      debtAmount,
      creditAmount,
      debtLimit
    } = req.body || {}

    const pool =
      await getConnection()

    await pool.request()

      .input(
        'Id',
        sql.Int,
        id
      )

      .input(
        'CustomerCode',
        sql.NVarChar(50),
        customerCode || null
      )

      .input(
        'CustomerName',
        sql.NVarChar(255),
        customerName
      )

      .input(
        'DebtAmount',
        sql.Float,
        Number(debtAmount)
      )

      .input(
        'CreditAmount',
        sql.Float,
        Number(creditAmount || 0)
      )

      .input(
        'DebtLimit',
        sql.Float,
        Number(debtLimit)
      )

      .query(`

        UPDATE CustomerDebts

        SET
          CustomerCode =
            @CustomerCode,

          CustomerName =
            @CustomerName,

          DebtAmount =
            @DebtAmount,

          CreditAmount =
            @CreditAmount,

          DebtLimit =
            @DebtLimit,

          UpdatedAt =
            GETDATE()

        WHERE Id = @Id

      `)

    res.json({
      message:
        'Cập nhật thành công'
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }
}

// ================= DELETE =================

exports.deleteDebt = async (
    req,
    res
) => {
    try {
        const { id } = req.params

        const pool =
            await getConnection()

        const check =
            await pool.request()

            .input(
                'Id',
                sql.Int,
                id
            )

            .query(`
                SELECT *
                FROM CustomerDebts
                WHERE Id = @Id

            `)

        if (
            check.recordset.length === 0
        ) {
            return res.status(404).json({
                error: 'Khách hàng không tồn tại'
            })
        }

        await pool.request()

            .input(
                'Id',
                sql.Int,
                id
            )
            .query(`
                DELETE FROM CustomerDebts
                WHERE Id = @Id`)
            res.json({
                message:
                    'Xóa khách hàng thành công'
            })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            error: error.message
        })
    }
}

// ================= IMPORT EXCEL =================
//
// Cấu trúc file Excel công nợ:
//   - Dòng 1-6: Header thông tin công ty (bỏ qua)
//   - Dòng 7: Header cột (Mã | Tên khách hàng | Dư đầu Nợ/Có | Phát sinh Nợ/Có | Dư cuối Nợ/Có)
//   - Dòng 8: Header con (Nợ | Có | Nợ | Có | Nợ | Có)
//   - Dòng 9: Số thứ tự cột (1-8)
//   - Dòng 10+: Dữ liệu
//
// Chỉ lấy dòng có Cột A (Mã khách hàng) khác null/rỗng:
//   - Cột A → CustomerCode (Mã khách hàng)
//   - Cột B → CustomerName (Tên khách hàng)
//   - Cột G → DebtAmount (Dư cuối Nợ)
//   - Cột H → CreditAmount (Dư cuối Có)
//
// Hạn mức (DebtLimit) được tính tự động:
//   - Nếu đang nợ (G > 0): DebtLimit = max(G × 1.5, 10,000,000)
//   - Nếu không nợ: DebtLimit = 10,000,000 (mặc định)
//   - Công thức này cho phép khách nợ thêm 50% so với nợ hiện tại

const XLSX = require('xlsx')

exports.importDebts = async (
  req,
  res
) => {

  try {

    if (!req.file) {

      return res.status(400).json({
        error: 'Không có file'
      })

    }

    const workbook =
      XLSX.read(
        req.file.buffer,
        { type: 'buffer' }
      )

    const sheetName =
      workbook.SheetNames[0]

    const sheet =
      workbook.Sheets[sheetName]

    // ✅ Đọc bằng header:1 để lấy theo index cột thay vì tên cột
    const rows =
      XLSX.utils.sheet_to_json(sheet, { header: 1 })

    const pool =
      await getConnection()

    let imported = 0
    let skipped = 0
    let updated = 0

    for (let i = 0; i < rows.length; i++) {

      const row = rows[i]

      // Cột A = index 0, B = index 1, G = index 6, H = index 7
      const colA = row[0]   // Mã khách hàng
      const colB = row[1]   // Tên khách hàng
      const colG = row[6]   // Dư cuối Nợ
      const colH = row[7]   // Dư cuối Có

      // ✅ Chỉ lấy dòng có Cột A (Mã khách hàng) khác null/rỗng
      if (colA === undefined || colA === null || String(colA).trim() === '') {
        skipped++
        continue
      }

      // Trim mã khách hàng (file Excel có nhiều khoảng trắng)
      const customerCode = String(colA).trim()
      const customerName = colB ? String(colB).trim() : ''

      // Bỏ qua nếu không có tên khách hàng
      if (!customerName) {
        skipped++
        continue
      }

      // Parse số — Dư cuối Nợ (G) và Dư cuối Có (H)
      const debtAmount = parseFloat(colG) || 0
      const creditAmount = parseFloat(colH) || 0

      // ✅ Tính hạn mức tự động:
      // - Nếu đang nợ (Dư cuối Nợ > 0): Hạn mức = max(Nợ × 1.5, 10,000,000)
      // - Nếu không nợ: Hạn mức = 10,000,000
      let debtLimit = 10000000  // Mặc định 10 triệu

      if (debtAmount > 0) {
        debtLimit = Math.max(debtAmount * 1.5, 10000000)
      }

      // Làm tròn hạn mức xuống triệu đồng chẵn
      debtLimit = Math.floor(debtLimit / 1000000) * 1000000

      // MERGE: Nếu CustomerCode đã tồn tại → UPDATE, chưa → INSERT
      const result = await pool.request()

        .input(
          'CustomerCode',
          sql.NVarChar(50),
          customerCode
        )

        .input(
          'CustomerName',
          sql.NVarChar(255),
          customerName
        )

        .input(
          'DebtAmount',
          sql.Float,
          debtAmount
        )

        .input(
          'CreditAmount',
          sql.Float,
          creditAmount
        )

        .input(
          'DebtLimit',
          sql.Float,
          debtLimit
        )

        .query(`

          MERGE CustomerDebts AS target

          USING (
            SELECT
              @CustomerCode
              AS CustomerCode
          ) AS source

          ON target.CustomerCode =
             source.CustomerCode

          WHEN MATCHED THEN

            UPDATE SET

              CustomerName =
                @CustomerName,

              DebtAmount =
                @DebtAmount,

              CreditAmount =
                @CreditAmount,

              DebtLimit =
                @DebtLimit,

              UpdatedAt =
                GETDATE()

          WHEN NOT MATCHED THEN

            INSERT
            (
              CustomerCode,
              CustomerName,
              DebtAmount,
              CreditAmount,
              DebtLimit,
              CreatedAt,
              UpdatedAt
            )

            VALUES
            (
              @CustomerCode,
              @CustomerName,
              @DebtAmount,
              @CreditAmount,
              @DebtLimit,
              GETDATE(),
              GETDATE()
            );

        `)

      // Kiểm tra xem là INSERT hay UPDATE
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        // Kiểm tra existing để phân biệt insert/update
        const check = await pool.request()
          .input('CustomerCode', sql.NVarChar(50), customerCode)
          .query('SELECT Id FROM CustomerDebts WHERE CustomerCode = @CustomerCode')

        if (check.recordset.length > 0) {
          // Có thể là update (đã tồn tại trước đó)
          updated++
        }
        imported++
      }

    }

    res.json({
      message: `Import thành công: ${imported} khách hàng (đã cập nhật ${updated} khách có sẵn)`,
      imported,
      updated,
      skipped
    })

  } catch (error) {

    console.error('IMPORT ERROR:', error)

    res.status(500).json({
      error: error.message
    })

  }

}
