import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiUsers,
  FiShoppingCart,
  FiFileText,
  FiTrendingUp,
  FiActivity,
  FiSettings,
  FiUserPlus,
  FiBarChart2,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiServer
} from 'react-icons/fi'

import {
  AreaChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

import apiClient from '../../services/api'
import './Dashboard.css'

interface DashboardStats {
  totalUsers: number
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  activeUsers: number
  systemHealth: number
}

interface RecentActivity {
  id: number
  type: 'user' | 'order' | 'system'
  message: string
  time: string
  icon: any
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeUsers: 0,
    systemHealth: 98
  })

  const [loading, setLoading] = useState(true)

  const [recentActivities, setRecentActivities] =
    useState<RecentActivity[]>([])

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      const usersRes = await apiClient.get('/api/users')

      const totalUsers = Array.isArray(usersRes.data)
        ? usersRes.data.length
        : 0

      setStats({
        totalUsers,
        totalOrders: 25,
        pendingOrders: 8,
        completedOrders: 17,
        activeUsers: Math.floor(totalUsers * 0.7),
        systemHealth: 98
      })

      setRecentActivities([
        {
          id: 1,
          type: 'user',
          message:
            'Người dùng mới đăng ký: coordinator1',
          time: '2 giờ trước',
          icon: FiUserPlus
        },
        {
          id: 2,
          type: 'order',
          message: 'Đơn hàng #ORD-001 đã được duyệt',
          time: '4 giờ trước',
          icon: FiCheckCircle
        },
        {
          id: 3,
          type: 'system',
          message: 'Sao lưu hệ thống hoàn tất',
          time: '1 ngày trước',
          icon: FiServer
        },
        {
          id: 4,
          type: 'order',
          message: 'Đơn hàng #ORD-002 được tạo mới',
          time: '2 ngày trước',
          icon: FiShoppingCart
        }
      ])
    } catch (error) {
      console.error(
        'Lỗi khi lấy dữ liệu dashboard:',
        error
      )
    } finally {
      setLoading(false)
    }
  }

  const salesData = [
    { day: 'T2', orders: 12, revenue: 25 },
    { day: 'T3', orders: 19, revenue: 40 },
    { day: 'T4', orders: 15, revenue: 32 },
    { day: 'T5', orders: 27, revenue: 58 },
    { day: 'T6', orders: 35, revenue: 70 },
    { day: 'T7', orders: 30, revenue: 65 },
    { day: 'CN', orders: 22, revenue: 48 }
  ]

  const orderStatusData = [
    {
      name: 'Hoàn thành',
      value: 17,
      color: '#43e97b'
    },
    {
      name: 'Đang xử lý',
      value: 8,
      color: '#4facfe'
    },
    {
      name: 'Hủy',
      value: 2,
      color: '#f5576c'
    }
  ]

  const statCards = [
    {
      title: 'Tổng người dùng',
      value: stats.totalUsers,
      subtitle: `+${
        Math.floor(stats.totalUsers * 0.15)
      } tuần này`,
      icon: FiUsers,
      gradient:
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'Tổng đơn hàng',
      value: stats.totalOrders,
      subtitle: `+${
        Math.floor(stats.totalOrders * 0.08)
      } hôm nay`,
      icon: FiShoppingCart,
      gradient:
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      title: 'Đơn chờ xử lý',
      value: stats.pendingOrders,
      subtitle: 'Cần phê duyệt',
      icon: FiClock,
      gradient:
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      title: 'Đơn hoàn thành',
      value: stats.completedOrders,
      subtitle: `${Math.round(
        (stats.completedOrders /
          stats.totalOrders) *
          100
      )}% tỷ lệ thành công`,
      icon: FiCheckCircle,
      gradient:
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    {
      title: 'Người dùng hoạt động',
      value: stats.activeUsers,
      subtitle: `${Math.round(
        (stats.activeUsers / stats.totalUsers) *
          100
      )}% tổng số`,
      icon: FiActivity,
      gradient:
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
    {
      title: 'Tình trạng hệ thống',
      value: `${stats.systemHealth}%`,
      subtitle: 'Hoạt động tốt',
      icon: FiServer,
      gradient:
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    }
  ]

  const getActivityIconColor = (type: string) => {
    switch (type) {
      case 'user':
        return '#667eea'

      case 'order':
        return '#43e97b'

      case 'system':
        return '#f5576c'

      default:
        return '#95a5a6'
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <div>
          <h1>Bảng điều khiển quản trị</h1>
          <p>Tổng quan hệ thống và các chỉ số chính</p>
        </div>

        <div className="header-actions">
        <button
          className="action-btn primary"
          onClick={() => navigate('/admin/settings')}
        >
          <FiSettings size={16} />
          Cài đặt
        </button>

          <button className="action-btn secondary">
            <FiBarChart2 size={16} />
            Báo cáo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            {statCards.map((card, index) => {
              const Icon = card.icon

              return (
                <div
                  key={index}
                  className="stat-card"
                  style={{
                    background: card.gradient
                  }}
                >
                  <div className="stat-icon">
                    <Icon size={28} />
                  </div>

                  <div className="stat-content">
                    <h3>{card.title}</h3>

                    <p className="stat-value">
                      {card.value}
                    </p>

                    <p className="stat-subtitle">
                      {card.subtitle}
                    </p>
                  </div>

                  <div className="stat-decoration">
                    <div className="decoration-circle"></div>
                    <div className="decoration-triangle"></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Dashboard Grid */}
          <div className="dashboard-grid">

            {/* Chart */}
            <div className="dashboard-card chart-card large">
              <div className="card-header">
                <div className="chart-title-wrap">
                  <h2>
                    <FiTrendingUp size={20} />
                    Doanh thu & đơn hàng
                  </h2>

                  <p>
                    Theo dõi hiệu suất kinh doanh
                    trong tuần
                  </p>
                </div>

                <select
                  className="chart-filter"
                  defaultValue="7ngay"
                >
                  <option value="7ngay">
                    7 ngày
                  </option>

                  <option value="30ngay">
                    30 ngày
                  </option>

                  <option value="1nam">
                    1 năm
                  </option>
                </select>
              </div>

              <div className="chart-stats">
                <div className="chart-stat-box">
                  <h4>Tổng doanh thu</h4>
                  <h3>338M</h3>
                  <span>+12.5%</span>
                </div>

                <div className="chart-stat-box">
                  <h4>Tổng đơn hàng</h4>
                  <h3>160</h3>
                  <span>+8.2%</span>
                </div>

                <div className="chart-stat-box">
                  <h4>Tăng trưởng</h4>
                  <h3>86%</h3>
                  <span>Ổn định</span>
                </div>
              </div>

              <ResponsiveContainer
                width="100%"
                height={360}
              >
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#435ebe"
                        stopOpacity={0.4}
                      />

                      <stop
                        offset="100%"
                        stopColor="#435ebe"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip />
                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#435ebe"
                    strokeWidth={4}
                    fill="url(#colorRevenue)"
                    name="Doanh thu"
                  />

                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#f5576c"
                    strokeWidth={4}
                    dot={{
                      r: 5,
                      strokeWidth: 3,
                      fill: '#fff'
                    }}
                    activeDot={{
                      r: 7
                    }}
                    name="Đơn hàng"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="dashboard-card pie-card">
              <div className="card-header">
                <h2>
                  <FiShoppingCart size={20} />
                  Trạng thái đơn hàng
                </h2>
              </div>

              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label
                  >
                    {orderStatusData.map(
                      (entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.color}
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Activities */}
            <div className="dashboard-card activities-card">
              <div className="card-header">
                <h2>
                  <FiActivity size={20} />
                  Hoạt động gần đây
                </h2>

                <button className="view-all-btn">
                  Xem tất cả
                </button>
              </div>

              <div className="activities-list">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon

                  return (
                    <div
                      key={activity.id}
                      className="activity-item"
                    >
                      <div
                        className="activity-icon"
                        style={{
                          backgroundColor:
                            getActivityIconColor(
                              activity.type
                            )
                        }}
                      >
                        <Icon size={16} />
                      </div>

                      <div className="activity-content">
                        <p className="activity-message">
                          {activity.message}
                        </p>

                        <span className="activity-time">
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-card actions-card">
              <div className="card-header">
                <h2>
                  <FiTrendingUp size={20} />
                  Thao tác nhanh
                </h2>
              </div>

              <div className="quick-actions-grid">
                <button className="quick-action-btn primary"
                 onClick={() => navigate('/admin/users')}
                >
                  <FiUserPlus size={24} />
                  <span>Tạo người dùng</span>
                </button>

                <button className="quick-action-btn secondary">
                  <FiFileText size={24} />
                  <span>Xuất báo cáo</span>
                </button>

                <button className="quick-action-btn success">
                  <FiBarChart2 size={24} />
                  <span>Xem thống kê</span>
                </button>

                <button
                  className="quick-action-btn warning"
                  onClick={() => navigate('/admin/settings')}
                >
                  <FiSettings size={24} />
                  <span>Cài đặt hệ thống</span>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="dashboard-card status-card">
              <div className="card-header">
                <h2>
                  <FiServer size={20} />
                  Tình trạng hệ thống
                </h2>
              </div>

              <div className="system-status">
                <div className="status-item">
                  <div className="status-label">
                    <FiCheckCircle size={16} />
                    <span>Database</span>
                  </div>

                  <div className="status-indicator online"></div>
                </div>

                <div className="status-item">
                  <div className="status-label">
                    <FiCheckCircle size={16} />
                    <span>API Server</span>
                  </div>

                  <div className="status-indicator online"></div>
                </div>

                <div className="status-item">
                  <div className="status-label">
                    <FiAlertTriangle size={16} />
                    <span>Backup Service</span>
                  </div>

                  <div className="status-indicator warning"></div>
                </div>

                <div className="status-item">
                  <div className="status-label">
                    <FiCheckCircle size={16} />
                    <span>Email Service</span>
                  </div>

                  <div className="status-indicator online"></div>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="dashboard-card chart-card">
              <div className="card-header">
                <h2>
                  <FiBarChart2 size={20} />
                  Hiệu suất hệ thống
                </h2>
              </div>

              <div className="chart-placeholder">
                <div className="chart-bars">
                  <div
                    className="chart-bar"
                    style={{ height: '60%' }}
                  ></div>

                  <div
                    className="chart-bar"
                    style={{ height: '80%' }}
                  ></div>

                  <div
                    className="chart-bar"
                    style={{ height: '40%' }}
                  ></div>

                  <div
                    className="chart-bar"
                    style={{ height: '90%' }}
                  ></div>

                  <div
                    className="chart-bar"
                    style={{ height: '70%' }}
                  ></div>

                  <div
                    className="chart-bar"
                    style={{ height: '85%' }}
                  ></div>

                  <div
                    className="chart-bar"
                    style={{ height: '75%' }}
                  ></div>
                </div>

                <div className="chart-labels">
                  <span>T2</span>
                  <span>T3</span>
                  <span>T4</span>
                  <span>T5</span>
                  <span>T6</span>
                  <span>T7</span>
                  <span>CN</span>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}