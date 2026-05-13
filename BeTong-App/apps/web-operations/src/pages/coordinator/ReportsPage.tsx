import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { Link } from 'react-router-dom'

interface SummaryStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  inTransitOrders: number
  revenue: number
}

export default function CoordinatorReportsPage() {
  const [stats, setStats] = useState<SummaryStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    inTransitOrders: 0,
    revenue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/api/orders/my-orders')
        const orders = Array.isArray(response.data) ? response.data : []

        const totalOrders = orders.length
        const pendingOrders = orders.filter((o: any) => o.OrderStatus === 'Pending Approval').length
        const completedOrders = orders.filter((o: any) => o.OrderStatus === 'Completed').length
        const inTransitOrders = orders.filter((o: any) => ['Sent', 'Delivered', 'In Transit'].includes(o.OrderStatus)).length
        const revenue = orders.reduce((sum: number, order: any) => sum + (order.TotalAmount || 0), 0)

        setStats({ totalOrders, pendingOrders, completedOrders, inTransitOrders, revenue })
      } catch (error) {
        console.error('Lỗi tải báo cáo:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [])

  return (
    <div className="page-section" style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1>Báo cáo điều phối viên</h1>
        <p>Thông tin tổng quan đơn hàng và doanh thu của bạn.</p>
      </div>

      {loading ? (
        <div>Đang tải báo cáo...</div>
      ) : (
        <div style={{ display: 'grid', gap: 20, maxWidth: 900 }}>
          <div style={{ padding: 20, background: '#fff', borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
            <h2>Tổng quan</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
              <div style={{ padding: 16, background: '#f5f8ff', borderRadius: 12 }}>
                <strong>{stats.totalOrders}</strong>
                <p>Tổng đơn hàng</p>
              </div>
              <div style={{ padding: 16, background: '#fff4e6', borderRadius: 12 }}>
                <strong>{stats.pendingOrders}</strong>
                <p>Đang chờ</p>
              </div>
              <div style={{ padding: 16, background: '#e8f7ec', borderRadius: 12 }}>
                <strong>{stats.completedOrders}</strong>
                <p>Hoàn thành</p>
              </div>
              <div style={{ padding: 16, background: '#e9f5ff', borderRadius: 12 }}>
                <strong>{stats.inTransitOrders}</strong>
                <p>Đang vận chuyển</p>
              </div>
            </div>
          </div>

          <div style={{ padding: 20, background: '#fff', borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
            <h2>Doanh thu</h2>
            <p style={{ fontSize: 32, margin: '16px 0' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.revenue)}</p>
            <p>Doanh thu ước tính từ đơn hàng hiện tại của bạn.</p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/coordinator/orders" style={{ padding: '12px 18px', borderRadius: 12, background: '#4e73df', color: '#fff', textDecoration: 'none' }}>
              Quay lại đơn hàng
            </Link>
            <Link to="/coordinator" style={{ padding: '12px 18px', borderRadius: 12, background: '#6c757d', color: '#fff', textDecoration: 'none' }}>
              Về dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
