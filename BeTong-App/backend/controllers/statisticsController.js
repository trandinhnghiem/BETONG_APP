const { getConnection } = require('../config/database')
// sửa đúng path theo project của bạn

exports.getStatistics = async (req, res) => {
  try {

    const pool = await getConnection()

    // ======================
    // DOANH THU THEO THÁNG
    // ======================

    const revenueResult = await pool
      .request()
      .query(`
        SELECT
          MONTH(CreatedAt) as month,
          SUM(TotalAmount) as revenue
        FROM Orders
        GROUP BY MONTH(CreatedAt)
        ORDER BY month
      `)

    // ======================
    // TRẠNG THÁI ĐƠN
    // ======================

    const statusResult = await pool
      .request()
      .query(`
        SELECT
          OrderStatus,
          COUNT(*) as total
        FROM Orders
        GROUP BY OrderStatus
      `)

    // ======================
    // FORMAT DATA
    // ======================

    const salesData =
      revenueResult.recordset.map(item => ({
        month: `T${item.month}`,
        revenue: Number(item.revenue || 0)
      }))

    const statusData =
      statusResult.recordset.map(item => ({
        name: item.OrderStatus,
        value: item.total,
        color:
          item.OrderStatus === 'Completed'
            ? '#43e97b'
            : item.OrderStatus === 'Pending'
            ? '#4facfe'
            : '#f5576c'
      }))

    res.json({
        salesData,
        statusData,

        summary: {
            revenue: 250000000,
            orders: 120,
            customers: 55,
            growth: 18
        }
        })

  } catch (err) {

    console.error('Statistics Error:', err)

    res.status(500).json({
      message: 'Lỗi server'
    })
  }
}