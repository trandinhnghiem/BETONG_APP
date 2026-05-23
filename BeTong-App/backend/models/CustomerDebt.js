const { getConnection, sql } =
  require('../config/database')

class CustomerDebtModel {

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

}

module.exports =
  CustomerDebtModel