import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import './StationDashboard.css'

export default function StationDashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    sent: 0,
    delivered: 0,
    completed: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const userRole = localStorage.getItem('userRole')
      const stationId = localStorage.getItem('stationId')

      const res = await apiClient.get('/api/orders/station-orders')
      let orders = res.data || []

      // 👉 Nếu là trạm → backend đã filter sẵn
      // 👉 Nếu là coordinator → có thể filter thêm nếu cần

      const pending = orders.filter((o: any) => o.OrderStatus === 'Pending Approval').length
      const approved = orders.filter((o: any) => o.OrderStatus === 'Approved').length
      const sent = orders.filter((o: any) => o.OrderStatus === 'Sent').length
      const delivered = orders.filter((o: any) => o.OrderStatus === 'Delivered').length
      const completed = orders.filter((o: any) => o.OrderStatus === 'Completed').length

      setStats({ pending, approved, sent, delivered, completed })

    } catch (err) {
      console.error(err)
      setStats({
        pending: 0,
        approved: 0,
        sent: 0,
        delivered: 0,
        completed: 0
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="station-dashboard">

      <h1>🏭 Dashboard Trạm</h1>
      <p>Tổng quan trạng thái đơn hàng</p>

      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <div className="status-grid">

          <div className="status-card pending">
            <h3>Chờ duyệt</h3>
            <p>{stats.pending}</p>
          </div>

          <div className="status-card approved">
            <h3>Đã duyệt</h3>
            <p>{stats.approved}</p>
          </div>

          <div className="status-card sent">
            <h3>Đang giao</h3>
            <p>{stats.sent}</p>
          </div>

          <div className="status-card delivered">
            <h3>Đã giao</h3>
            <p>{stats.delivered}</p>
          </div>

          <div className="status-card completed">
            <h3>Hoàn thành</h3>
            <p>{stats.completed}</p>
          </div>

        </div>
      )}

    </div>
  )
}