const XLSX = require('xlsx')

const {
  getConnection,
  sql
} = require('../config/database')

class CustomerDebtController {

  // ================= GET ALL =================

  static async getAll(req, res) {

    try {

      const pool =
        await getConnection()

      const result =
        await pool.request().query(`
          SELECT *
          FROM CustomerDebts
          ORDER BY CustomerName
        `)

      res.json(result.recordset)

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })

    }

  }

  // ================= IMPORT EXCEL =================

  static async importDebts(req, res) {

    try {

      if (!req.file) {

        return res.status(400).json({
          error: 'Không có file'
        })

      }

      const workbook =
        XLSX.read(req.file.buffer, {
          type: 'buffer'
        })

      const sheetName =
        workbook.SheetNames[0]

      const sheet =
        workbook.Sheets[sheetName]

      const rows =
        XLSX.utils.sheet_to_json(sheet)

      console.log('ROWS:', rows)

      const pool =
        await getConnection()

      for (const row of rows) {

        const customerName =
          row.CustomerName ||
          row.customerName ||
          row['Tên khách hàng']

        const debtAmount =
          Number(
            row.DebtAmount ||
            row.debtAmount ||
            row['Công nợ'] ||
            0
          )

        const debtLimit =
          Number(
            row.DebtLimit ||
            row.debtLimit ||
            row['Hạn mức'] ||
            0
          )

        if (!customerName) continue

        console.log(
          'IMPORT:',
          customerName,
          debtAmount,
          debtLimit
        )

        await pool.request()

          .input(
            'CustomerName',
            sql.NVarChar,
            customerName
          )

          .input(
            'DebtAmount',
            sql.Decimal(18, 2),
            debtAmount
          )

          .input(
            'DebtLimit',
            sql.Decimal(18, 2),
            debtLimit
          )

          .query(`

            MERGE CustomerDebts AS target

            USING (
              SELECT
                @CustomerName AS CustomerName
            ) AS source

            ON target.CustomerName =
               source.CustomerName

            WHEN MATCHED THEN

              UPDATE SET

                DebtAmount =
                  @DebtAmount,

                DebtLimit =
                  @DebtLimit,

                UpdatedAt =
                  GETDATE()

            WHEN NOT MATCHED THEN

              INSERT (
                CustomerName,
                DebtAmount,
                DebtLimit,
                CreatedAt,
                UpdatedAt
              )

              VALUES (
                @CustomerName,
                @DebtAmount,
                @DebtLimit,
                GETDATE(),
                GETDATE()
              );

          `)

      }

      res.json({
        message: 'Import thành công',
        total: rows.length
      })

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error: err.message
      })

    }

  }

}

module.exports =
  CustomerDebtController