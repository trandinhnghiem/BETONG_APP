const { getConnection } =
  require('../config/database')

exports.getStatistics =
  async (req, res) => {

    try {

      const pool =
        await getConnection()

      // ======================
      // FILTER
      // ======================

      const type = req.query.type

      const from = req.query.from

      const to = req.query.to

      let whereClause = ''

      // FILTER PRESET

      if (type === '7days') {

        whereClause = `
          WHERE CreatedAt >=
          DATEADD(DAY, -7, GETDATE())
        `

      } else if (type === '30days') {

        whereClause = `
          WHERE CreatedAt >=
          DATEADD(DAY, -30, GETDATE())
        `

      } else if (type === '1year') {

        whereClause = `
          WHERE CreatedAt >=
          DATEADD(YEAR, -1, GETDATE())
        `
      }

      // FILTER CUSTOM DATE

      if (from && to) {

        whereClause = `
          WHERE CAST(CreatedAt AS DATE)
          BETWEEN '${from}'
          AND '${to}'
        `
      }

      // ======================
      // REVENUE CHART
      // ======================

      const revenueResult =
        await pool.request().query(`

          SELECT
            CAST(CreatedAt AS DATE)
              as date,

            SUM(TotalAmount)
              as revenue

          FROM Orders

          ${whereClause}

          GROUP BY
            CAST(CreatedAt AS DATE)

          ORDER BY date

      `)

      // ======================
      // STATUS PIE
      // ======================

      const statusResult =
        await pool.request().query(`

          SELECT
            OrderStatus,

            COUNT(*) as total

          FROM Orders

          ${whereClause}

          GROUP BY OrderStatus

      `)

      // ======================
      // SUMMARY
      // ======================

      const summaryResult =
        await pool.request().query(`

          SELECT

            SUM(TotalAmount)
              as revenue,

            COUNT(*) as orders,

            COUNT(DISTINCT CustomerName)
              as customers

          FROM Orders

          ${whereClause}

      `)

      // ======================
      // FORMAT SALES DATA
      // ======================

      const salesData =
        revenueResult.recordset.map(
          item => ({

            month:
              new Date(item.date)
                .toLocaleDateString(
                  'vi-VN',
                  {
                    day: '2-digit',
                    month: '2-digit'
                  }
                ),

            revenue:
              Number(item.revenue || 0),

            date: item.date

          })
        )

      // ======================
      // FORMAT STATUS DATA
      // ======================

      const statusData =
        statusResult.recordset.map(
          item => ({

            name: item.OrderStatus,

            value: item.total,

            color:

              item.OrderStatus ===
              'Completed'

                ? '#22c55e'

              : item.OrderStatus ===
                'Pending'

                ? '#3b82f6'

              : item.OrderStatus ===
                'Rejected'

                ? '#ef4444'

              : '#f59e0b'

          })
        )

      // ======================
      // SUMMARY DATA
      // ======================

      const summary =
        summaryResult.recordset[0]

      // ======================
      // RESPONSE
      // ======================

      res.json({

        salesData,

        statusData,

        summary: {

          revenue:
            Number(
              summary.revenue || 0
            ),

          orders:
            Number(
              summary.orders || 0
            ),

          customers:
            Number(
              summary.customers || 0
            ),

          growth: 18
        }
      })

    } catch (err) {

      console.error(
        'Statistics Error:',
        err
      )

      res.status(500).json({
        message: 'Lỗi server'
      })
    }
}