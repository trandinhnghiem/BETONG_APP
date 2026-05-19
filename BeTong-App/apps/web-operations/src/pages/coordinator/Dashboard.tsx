import { useEffect, useState } from 'react'
import { FiPlus, FiShoppingCart, FiClock, FiCheckCircle, FiTruck, FiTrendingUp, FiPackage, FiMapPin, FiBarChart2 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import './Dashboard.css'

interface Order {
  id: number
  orderCode: string
  orderStatus: string
  totalAmount: number
  createdAt: string
  destinationStation: string
}

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  inTransitOrders: number
  monthlyRevenue: number
  activeStations: number
}

export default function CoordinatorDashboard() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    inTransitOrders: 0,
    monthlyRevenue: 0,
    activeStations: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [ordersResponse, stationsResponse] = await Promise.all([
        apiClient.get('/api/orders/my-orders'),
        apiClient.get('/api/orders/stations')
      ])

      const ordersData = Array.isArray(ordersResponse.data) ? ordersResponse.data : []
      const stationsData = Array.isArray(stationsResponse.data) ? stationsResponse.data : []

      const parsedOrders = ordersData.map((order: any) => ({
        id: order.Id,
        orderCode: order.OrderCode,
        orderStatus: order.OrderStatus,
        totalAmount: order.TotalAmount ?? 0,
        createdAt: order.CreatedAt,
        destinationStation: order.DestinationStation
      }))

      const totalOrders = parsedOrders.length
      const pendingOrders = parsedOrders.filter((order) => order.orderStatus === 'Pending Approval').length
      const completedOrders = parsedOrders.filter((order) => order.orderStatus === 'Completed').length
      const inTransitOrders = parsedOrders.filter((order) => ['Sent', 'Delivered', 'Uploading', 'Approved', 'In Transit'].includes(order.orderStatus)).length
      const monthlyRevenue = parsedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)

      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        inTransitOrders,
        monthlyRevenue,
        activeStations: stationsData.length
      })
      setRecentOrders(parsedOrders.slice(0, 4))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setStats({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        inTransitOrders: 0,
        monthlyRevenue: 0,
        activeStations: 0
      })
      setRecentOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return '#f39c12'
      case 'Pending Approval': return '#e74c3c'
      case 'In Transit': return '#3498db'
      case 'Completed': return '#27ae60'
      default: return '#95a5a6'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="coordinator-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="coordinator-dashboard">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Điều phối viên Dashboard</h1>
          <p>Quản lý đơn hàng và giám sát hoạt động</p>
        </div>
        <div className="header-actions">
          <Link to="/coordinator/create-order" className="action-btn primary">
            <FiPlus size={16} />
            Tạo đơn hàng
          </Link>
          <button className="action-btn secondary">
            <FiBarChart2 size={16} />
            Báo cáo
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-icon">
            <FiShoppingCart size={24} />
          </div>
          <div className="stat-content">
            <h3>Tổng đơn hàng</h3>
            <div className="stat-value">{stats.totalOrders}</div>
            <div className="stat-subtitle">Tháng này</div>
          </div>
          <div className="stat-decoration">
            <div className="decoration-circle"></div>
          </div>
        </div>

        <div className="stat-card stat-card--warning">
          <div className="stat-icon">
            <FiClock size={24} />
          </div>
          <div className="stat-content">
            <h3>Chờ duyệt</h3>
            <div className="stat-value">{stats.pendingOrders}</div>
            <div className="stat-subtitle">Cần xử lý</div>
          </div>
          <div className="stat-decoration">
            <div className="decoration-triangle"></div>
          </div>
        </div>

        <div className="stat-card stat-card--info">
          <div className="stat-icon">
            <FiTruck size={24} />
          </div>
          <div className="stat-content">
            <h3>Đang vận chuyển</h3>
            <div className="stat-value">{stats.inTransitOrders}</div>
            <div className="stat-subtitle">Trong lộ trình</div>
          </div>
          <div className="stat-decoration">
            <div className="decoration-circle"></div>
          </div>
        </div>

        <div className="stat-card stat-card--success">
          <div className="stat-icon">
            <FiCheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Hoàn thành</h3>
            <div className="stat-value">{stats.completedOrders}</div>
            <div className="stat-subtitle">Đã giao</div>
          </div>
          <div className="stat-decoration">
            <div className="decoration-triangle"></div>
          </div>
        </div>

        <div className="stat-card stat-card--secondary">
          <div className="stat-icon">
            <FiTrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Doanh thu</h3>
            <div className="stat-value">{formatCurrency(stats.monthlyRevenue)}</div>
            <div className="stat-subtitle">Tháng này</div>
          </div>
          <div className="stat-decoration">
            <div className="decoration-circle"></div>
          </div>
        </div>

        <div className="stat-card stat-card--accent">
          <div className="stat-icon">
            <FiMapPin size={24} />
          </div>
          <div className="stat-content">
            <h3>Trạm hoạt động</h3>
            <div className="stat-value">{stats.activeStations}</div>
            <div className="stat-subtitle">Đang online</div>
          </div>
          <div className="stat-decoration">
            <div className="decoration-triangle"></div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-grid">
        {/* Recent Orders */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>
              <FiPackage size={20} />
              Đơn hàng gần đây
            </h2>
            <Link to="/coordinator/orders" className="view-all-btn">Xem tất cả</Link>
          </div>

          <div className="orders-list">
            {recentOrders.map((order) => (
              <div key={order.id} className="order-item">
                <div className="order-info">
                  <div className="order-code">{order.orderCode}</div>
                  <div className="order-details">
                    <span className="order-amount">{formatCurrency(order.totalAmount)}</span>
                    <span className="order-station">{order.destinationStation}</span>
                  </div>
                </div>
                <div className="order-status">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.orderStatus) }}
                  >
                    {order.orderStatus}
                  </span>
                  <div className="order-date">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Thao tác nhanh</h2>
          </div>

          <div className="quick-actions-grid">
            <Link to="/coordinator/create-order" className="quick-action-btn primary">
              <FiPlus size={24} />
              <span>Tạo đơn hàng</span>
            </Link>

            <Link to="/coordinator/orders" className="quick-action-btn secondary">
              <FiPackage size={24} />
              <span>Quản lý đơn hàng</span>
            </Link>

            
              <Link to="/coordinator/reports" className="quick-action-btn success">
                <FiBarChart2 size={24} />
                <span>Báo cáo</span>
              </Link>

             
            

            
               <Link to="/coordinator/stations" className="quick-action-btn warning">
                <FiMapPin size={24} />
                <span>Quản lý trạm</span>
              </Link>
            
          </div>
        </div>
      </div>
    </div>
  )
}

