import { useEffect, useState } from 'react'
import { FiUsers, FiShoppingCart, FiFileText, FiTrendingUp } from 'react-icons/fi'
import apiClient from '../../services/api'
import './Dashboard.css'

interface DashboardStats {
  totalUsers: number
  totalOrders: number
  pendingOrders: number
  completedOrders: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const usersRes = await apiClient.get('/api/users')
      const totalUsers = Array.isArray(usersRes.data) ? usersRes.data.length : 0

      setStats({
        totalUsers,
        totalOrders: 25,
        pendingOrders: 8,
        completedOrders: 17
      })
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Tổng số người dùng',
      value: stats.totalUsers,
      icon: FiUsers,
      color: 'blue'
    },
    {
      title: 'Tổng số đơn hàng',
      value: stats.totalOrders,
      icon: FiShoppingCart,
      color: 'green'
    },
    {
      title: 'Đơn hàng chờ xử lý',
      value: stats.pendingOrders,
      icon: FiFileText,
      color: 'orange'
    },
    {
      title: 'Đơn hàng đã hoàn thành',
      value: stats.completedOrders,
      icon: FiTrendingUp,
      color: 'purple'
    }
  ]

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Bảng điều khiển quản trị</h1>
        <p>Chào mừng bạn đến với hệ thống quản lý</p>
      </div>

      {loading ? (
        <div className="loading">Đang tải dữ liệu...</div>
      ) : (
        <div className="stats-grid">
          {statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <div key={index} className={`stat-card ${card.color}`}>
                <div className="stat-icon">
                  <Icon size={24} />
                </div>
                <div className="stat-content">
                  <h3>{card.title}</h3>
                  <p className="stat-value">{card.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="dashboard-sections">
        <div className="section">
          <h2>Hoạt động gần đây</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-time">2 giờ trước</span>
              <span className="activity-desc">Người dùng mới đăng ký: coordinator1</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">4 giờ trước</span>
              <span className="activity-desc">Đơn hàng #ORD-001 đã được duyệt</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">1 ngày trước</span>
              <span className="activity-desc">Sao lưu hệ thống hoàn tất</span>
            </div>
          </div>
        </div>

        <div className="section">
          <h2>Thao tác nhanh</h2>
          <div className="quick-actions">
            <button className="action-btn primary">Tạo người dùng</button>
            <button className="action-btn secondary">Xem báo cáo</button>
            <button className="action-btn secondary">Cài đặt hệ thống</button>
          </div>
        </div>
      </div>
    </div>
  )
}