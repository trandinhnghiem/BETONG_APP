const { getConnection, sql } =
  require('../config/database')

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

        SELECT *
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

    console.log(
      'BODY:',
      req.body
    )

    const {
      customerName,
      debtAmount,
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
        'DebtLimit',
        sql.Float,
        Number(debtLimit)
      )

      .query(`

        INSERT INTO CustomerDebts
        (
          CustomerName,
          DebtAmount,
          DebtLimit,
          CreatedAt,
          UpdatedAt
        )

        VALUES
        (
          @CustomerName,
          @DebtAmount,
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
      customerName,
      debtAmount,
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
        'DebtLimit',
        sql.Float,
        Number(debtLimit)
      )

      .query(`

        UPDATE CustomerDebts

        SET
          CustomerName =
            @CustomerName,

          DebtAmount =
            @DebtAmount,

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
// ================= IMPORT EXCEL =================

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

    const rows =
      XLSX.utils.sheet_to_json(sheet)

    const pool =
      await getConnection()

    for (const row of rows) {

      const customerName =
        row.CustomerName ||
        row.customerName ||
        row['Khách hàng']

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

      if (!customerName)
        continue

      await pool.request()

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
          'DebtLimit',
          sql.Float,
          debtLimit
        )

        .query(`

          MERGE CustomerDebts AS target

          USING (
            SELECT
              @CustomerName
              AS CustomerName
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

            INSERT
            (
              CustomerName,
              DebtAmount,
              DebtLimit,
              CreatedAt,
              UpdatedAt
            )

            VALUES
            (
              @CustomerName,
              @DebtAmount,
              @DebtLimit,
              GETDATE(),
              GETDATE()
            );

        `)

    }

    res.json({
      message:
        'Import thành công'
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

}

exports.deleteDebt = async (
    req,
    res
) => {
    try {
        const { id } =req.params

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