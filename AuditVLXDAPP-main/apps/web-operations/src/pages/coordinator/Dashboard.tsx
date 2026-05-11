import { useEffect, useState } from 'react'
import { FiPlus, FiShoppingCart, FiClock, FiCheckCircle, FiTruck } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import './Dashboard.css'
import './Dashboard.css'

interface Order {
  id: number
  orderCode: string
  orderStatus: string
  totalAmount: number
  createdAt: string
  destinationStation: string
}

export default function CoordinatorDashboard() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    inTransitOrders: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Mock data for now - will be replaced with real API calls
      setRecentOrders([
        {
          id: 1,
          orderCode: 'ORD-001',
          orderStatus: 'Approved',
          totalAmount: 1500000,
          createdAt: '2024-01-15',
          destinationStation: 'Station A'
        },
        {
          id: 2,
          orderCode: 'ORD-002',
          orderStatus: 'Pending Approval',
          totalAmount: 2200000,
          createdAt: '2024-01-14',
          destinationStation: 'Station B'
        },
        {
          id: 3,
          orderCode: 'ORD-003',
          orderStatus: 'In Transit',
          totalAmount: 800000,
          createdAt: '2024-01-13',
          destinationStation: 'Station C'
        }
      ])

      setStats({
        totalOrders: 12,
        pendingOrders: 3,
        completedOrders: 8,
        inTransitOrders: 1
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'gray'
      case 'Pending Approval': return 'orange'
      case 'Approved': return 'blue'
      case 'In Transit': return 'purple'
      case 'Delivered': return 'green'
      case 'Completed': return 'green'
      default: return 'gray'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return FiShoppingCart
      case 'Pending Approval': return FiClock
      case 'Approved': return FiCheckCircle
      case 'In Transit': return FiTruck
      case 'Delivered': return FiCheckCircle
      case 'Completed': return FiCheckCircle
      default: return FiShoppingCart
    }
  }

  return (
    <div className="coordinator-dashboard">
      <div className="dashboard-header">
        <h1>Trang Điều Phối</h1>
        <p>Quản lý đơn hàng và theo dõi giao nhận</p>
      </div>

      {loading ? (
        <div className="loading">Đang tải bảng điều phối ...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon">
                <FiShoppingCart size={24} />
              </div>
              <div className="stat-content">
                <h3>Tổng Đơn Hàng</h3>
                <p className="stat-value">{stats.totalOrders}</p>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">
                <FiClock size={24} />
              </div>
              <div className="stat-content">
                <h3>Đang Chờ</h3>
                <p className="stat-value">{stats.pendingOrders}</p>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">
                <FiTruck size={24} />
              </div>
              <div className="stat-content">
                <h3>Đang Giao</h3>
                <p className="stat-value">{stats.inTransitOrders}</p>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <FiCheckCircle size={24} />
              </div>
              <div className="stat-content">
                <h3>Hoàn Thành</h3>
                <p className="stat-value">{stats.completedOrders}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            <div className="section">
              <div className="section-header">
                <h2>Đơn Hàng Gần Đây</h2>
                <Link to="/coordinator/orders" className="view-all-link">Xem Tất Cả Đơn Hàng</Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="empty-state">
                  <FiShoppingCart size={48} />
                  <p>Không tìm thấy đơn hàng</p>
                </div>
              ) : (
                <div className="orders-list">
                  {recentOrders.map((order) => {
                    const StatusIcon = getStatusIcon(order.orderStatus)
                    const statusColor = getStatusColor(order.orderStatus)

                    return (
                      <div key={order.id} className="order-item">
                        <div className="order-info">
                          <div className="order-header">
                            <h4>{order.orderCode}</h4>
                            <span className={`status-badge ${statusColor}`}>
                              <StatusIcon size={14} />
                              {order.orderStatus}
                            </span>
                          </div>
                          <p className="destination">To: {order.destinationStation}</p>
                          <p className="amount">{order.totalAmount.toLocaleString()} VND</p>
                          <p className="date">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="section">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                <Link to="/coordinator/orders/create" className="action-btn primary">
                  <FiPlus size={16} />
                  Tạo Đơn Hàng Mới
                </Link>
                <Link to="/coordinator/orders" className="action-btn secondary">
                  <FiShoppingCart size={16} />
                  Xem Tất Cả Đơn Hàng
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
