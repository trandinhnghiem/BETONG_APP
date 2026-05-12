import { useEffect, useState } from 'react'
import apiClient from '../../services/api'

interface InfoStat {
  label: string
  value: number
}

export default function StationDashboard() {
  const [sentCount, setSentCount] = useState(0)
  const [deliveredCount, setDeliveredCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/orders/station-orders')
      const orders = Array.isArray(response.data) ? response.data : []
      setTotalCount(orders.length)
      setSentCount(orders.filter((order: any) => order.OrderStatus === 'Sent').length)
      setDeliveredCount(orders.filter((order: any) => order.OrderStatus === 'Delivered').length)
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu trạm:', error)
      setTotalCount(0)
      setSentCount(0)
      setDeliveredCount(0)
    } finally {
      setLoading(false)
    }
  }

  const stats: InfoStat[] = [
    { label: 'Đơn đang chờ xử lý', value: sentCount },
    { label: 'Đơn đã nhận', value: deliveredCount },
    { label: 'Tổng đơn', value: totalCount }
  ]

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard Trạm</h1>
        <p>Xem đơn hàng được gửi tới trạm.</p>
      </div>

      {loading ? (
        <div>Đang tải dữ liệu...</div>
      ) : (
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
