const XLSX = require('xlsx')
const { getConnection, sql } = require('../config/database')

class CustomerDebtController {

  // IMPORT EXCEL
  static async importDebt(req, res) {

    try {

      if (!req.file) {
        return res.status(400).json({
          error: 'Chưa upload file'
        })
      }

      const workbook = XLSX.readFile(req.file.path)

      const sheetName = workbook.SheetNames[0]

      const sheet =
        workbook.Sheets[sheetName]

      const rows =
        XLSX.utils.sheet_to_json(sheet)

      const pool =
        await getConnection()

      for (const row of rows) {

        const customerName =
          row['Tên khách hàng']

        const debtAmount =
          Number(row['Công nợ']) || 0

        if (!customerName) continue

        // CHECK EXISTS
        const existing =
          await pool.request()
            .input(
              'CustomerName',
              sql.NVarChar,
              customerName
            )
            .query(`
              SELECT Id
              FROM CustomerDebts
              WHERE CustomerName = @CustomerName
            `)

        if (
          existing.recordset.length > 0
        ) {

          await pool.request()
            .input(
              'CustomerName',
              sql.NVarChar,
              customerName
            )
            .input(
              'DebtAmount',
              sql.Decimal(18,2),
              debtAmount
            )
            .query(`
              UPDATE CustomerDebts
              SET
                DebtAmount = @DebtAmount,
                UpdatedAt = GETDATE()
              WHERE CustomerName = @CustomerName
            `)

        } else {

          await pool.request()
            .input(
              'CustomerName',
              sql.NVarChar,
              customerName
            )
            .input(
              'DebtAmount',
              sql.Decimal(18,2),
              debtAmount
            )
            .query(`
              INSERT INTO CustomerDebts (
                CustomerName,
                DebtAmount
              )
              VALUES (
                @CustomerName,
                @DebtAmount
              )
            `)
        }
      }

      res.json({
        message: 'Import công nợ thành công'
      })

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })
    }
  }

  // GET ALL
  static async getDebts(req, res) {

    try {

      const pool =
        await getConnection()

      const result =
        await pool.request()
          .query(`
            SELECT *
            FROM CustomerDebts
            ORDER BY CustomerName
          `)

      res.json(result.recordset)

    } catch (err) {

      res.status(500).json({
        error: err.message
      })
    }
  }
}

module.exports =
  CustomerDebtController