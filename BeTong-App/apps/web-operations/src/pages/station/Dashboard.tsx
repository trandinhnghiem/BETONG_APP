import { useEffect, useState } from 'react'
import apiClient from '../../services/api'

interface InfoStat {
  label: string
  value: number
}

export default function StationDashboard() {
  const [ordersCount, setOrdersCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/orders/station-orders')
      setOrdersCount(Array.isArray(response.data) ? response.data.length : 0)
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu trạm:', error)
      setOrdersCount(0)
    } finally {
      setLoading(false)
    }
  }

  const stats: InfoStat[] = [
    { label: 'Đơn đang chờ xử lý', value: ordersCount },
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
