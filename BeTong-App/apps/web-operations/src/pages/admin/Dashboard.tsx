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

  const [salesData, setSalesData] = useState<any[]>([])
  const [orderStatusData, setOrderStatusData] = useState<any[]>([])
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [ordersList, setOrdersList] = useState<any[]>([])
  const [chartRange, setChartRange] = useState<string>('7ngay')
  const [chartSummary, setChartSummary] = useState<{ revenue: number; orders: number; growth: number }>({ revenue: 0, orders: 0, growth: 0 })
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  useEffect(() => {
    // recompute chart and summary whenever ordersList, chartRange or custom dates change
    computeChartForRange(chartRange)
  }, [ordersList, chartRange, customFrom, customTo])

  const computeChartForRange = (range: string) => {
    if (!ordersList || ordersList.length === 0) {
      setSalesData([])
      setChartSummary({ revenue: 0, orders: 0, growth: 0 })
      return
    }

    const getOrderStatus = (order: any) =>
      (order.OrderStatus || order.orderStatus || order.Status || order.status || '')
        .toString()
        .toLowerCase()

    const isCompletedOrder = (order: any) => getOrderStatus(order) === 'completed'

    const getOrderAmount = (order: any) => Number(order.TotalAmount || order.totalAmount || 0) || 0

    const completedRevenue = (orders: any[]) =>
      orders.reduce(
        (sum, o) => sum + (isCompletedOrder(o) ? getOrderAmount(o) : 0),
        0
      )

    const now = new Date()
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date

    if (range === 'custom') {
      if (!customFrom || !customTo) return

      const start = new Date(customFrom)
      start.setHours(0, 0, 0, 0)
      const end = new Date(customTo)
      end.setHours(23, 59, 59, 999)

      const diffDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1

      // previous period of same length
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - diffDays + 1)

      if (diffDays <= 90) {
        const points: any[] = []
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(start)
          d.setDate(start.getDate() + i)
          const label = `${d.getDate()}/${d.getMonth() + 1}`
          const s = new Date(d); s.setHours(0,0,0,0)
          const e = new Date(d); e.setHours(23,59,59,999)

          const dayOrders = ordersList.filter((o: any) => {
            const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
            return created >= s && created <= e
          })
          const revenue = completedRevenue(dayOrders)
          points.push({ day: label, orders: dayOrders.length, revenue })
        }

        const currentRevenue = points.reduce((s,p)=>s+p.revenue,0)
        const currentOrders = points.reduce((s,p)=>s+p.orders,0)

        const prevOrdersList = ordersList.filter((o: any) => {
          const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
          return created >= prevStart && created <= prevEnd
        })
        const prevRevenue = prevOrdersList.reduce((s:number,o:any)=>s+(Number(o.TotalAmount||o.totalAmount||0)||0),0)
        const growth = prevRevenue === 0 ? 0 : Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)

        setSalesData(points)
        setChartSummary({ revenue: currentRevenue, orders: currentOrders, growth })
      } else {
        // aggregate by month for long ranges
        const months: { start: Date; end: Date; label: string }[] = []
        let cur = new Date(start.getFullYear(), start.getMonth(), 1)
        const last = new Date(end.getFullYear(), end.getMonth(), 1)
        while (cur <= last) {
          const s = new Date(cur)
          const e = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
          months.push({ start: s, end: e, label: `${s.getMonth()+1}/${s.getFullYear()}` })
          cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
        }

        const points = months.map(({ start: s, end: e, label }) => {
          const monthOrders = ordersList.filter((o: any) => {
            const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
            return created >= s && created <= e
          })
          const revenue = completedRevenue(monthOrders)
          return { day: label, orders: monthOrders.length, revenue }
        })

        const currentRevenue = points.reduce((s,p)=>s+p.revenue,0)
        const currentOrders = points.reduce((s,p)=>s+p.orders,0)

        const prevRangeEnd = new Date(start); prevRangeEnd.setDate(prevRangeEnd.getDate() - 1)
        const prevRangeStart = new Date(prevRangeEnd); prevRangeStart.setDate(prevRangeStart.getDate() - diffDays + 1)
        const prevOrdersList = ordersList.filter((o: any) => {
          const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
          return created >= prevRangeStart && created <= prevRangeEnd
        })
        const prevRevenue = prevOrdersList.reduce((s:number,o:any)=>s+(Number(o.TotalAmount||o.totalAmount||0)||0),0)
        const growth = prevRevenue === 0 ? 0 : Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)

        setSalesData(points)
        setChartSummary({ revenue: currentRevenue, orders: currentOrders, growth })
      }
      return
    }

    if (range === '7ngay') {
      currentEnd = new Date(now)
      currentEnd.setHours(23, 59, 59, 999)
      currentStart = new Date(now)
      currentStart.setDate(currentStart.getDate() - 6)
      currentStart.setHours(0, 0, 0, 0)

      previousEnd = new Date(currentStart)
      previousEnd.setHours(23, 59, 59, 999)
      previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - 7)
      previousStart.setHours(0, 0, 0, 0)

      // build daily points for current period
      const days: { date: Date; label: string }[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(currentStart)
        d.setDate(currentStart.getDate() + i)
        const wd = d.getDay()
        const label = wd === 0 ? 'CN' : `T${wd + 1}`
        days.push({ date: d, label })
      }

      const sales = days.map(({ date, label }) => {
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)

        const dayOrders = ordersList.filter((o: any) => {
          const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
          return created >= start && created <= end
        })
        const revenue = completedRevenue(dayOrders)
        return { day: label, orders: dayOrders.length, revenue }
      })

      const currentRevenue = sales.reduce((s, p) => s + p.revenue, 0)
      const currentOrders = sales.reduce((s, p) => s + p.orders, 0)

      const prevOrders = ordersList.filter((o: any) => {
        const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
        return created >= previousStart && created <= previousEnd
      })
      const prevRevenue = completedRevenue(prevOrders)

      const growth = prevRevenue === 0 ? 0 : Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)

      setSalesData(sales)
      setChartSummary({ revenue: currentRevenue, orders: currentOrders, growth })
    } else if (range === '30ngay') {
      // daily for last 30 days
      currentEnd = new Date(now)
      currentEnd.setHours(23, 59, 59, 999)
      currentStart = new Date(now)
      currentStart.setDate(currentStart.getDate() - 29)
      currentStart.setHours(0, 0, 0, 0)

      previousEnd = new Date(currentStart)
      previousEnd.setHours(23, 59, 59, 999)
      previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - 30)
      previousStart.setHours(0, 0, 0, 0)

      const points: any[] = []
      for (let i = 0; i < 30; i++) {
        const d = new Date(currentStart)
        d.setDate(currentStart.getDate() + i)
        const label = `${d.getDate()}/${d.getMonth() + 1}`
        const start = new Date(d); start.setHours(0,0,0,0)
        const end = new Date(d); end.setHours(23,59,59,999)
        const dayOrders = ordersList.filter((o: any) => {
          const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
          return created >= start && created <= end
        })
        const revenue = completedRevenue(dayOrders)
        points.push({ day: label, orders: dayOrders.length, revenue })
      }
      const currentRevenue = points.reduce((s,p)=>s+p.revenue,0)
      const currentOrders = points.reduce((s,p)=>s+p.orders,0)

      const prevOrders = ordersList.filter((o: any) => {
        const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
        return created >= previousStart && created <= previousEnd
      })
      const prevRevenue = completedRevenue(prevOrders)
      const growth = prevRevenue === 0 ? 0 : Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)

      setSalesData(points)
      setChartSummary({ revenue: currentRevenue, orders: currentOrders, growth })
    } else {
      // 1 year aggregated monthly
      const months: { start: Date; end: Date; label: string }[] = []
      const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      for (let i = 11; i >= 0; i--) {
        const m = new Date(nowMonth.getFullYear(), nowMonth.getMonth() - i, 1)
        const start = new Date(m)
        const end = new Date(m.getFullYear(), m.getMonth()+1, 0)
        const label = `${m.getMonth()+1}/${m.getFullYear()}`
        months.push({ start, end, label })
      }

      const points = months.map(({ start, end, label }) => {
        const monthOrders = ordersList.filter((o: any) => {
          const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
          return created >= start && created <= end
        })
        const revenue = completedRevenue(monthOrders)
        return { day: label, orders: monthOrders.length, revenue }
      })

      const currentRevenue = points.reduce((s,p)=>s+p.revenue,0)
      const currentOrders = points.reduce((s,p)=>s+p.orders,0)

      // previous year same period
      const prevStart = new Date(now.getFullYear()-1, now.getMonth(), 1)
      const prevEnd = new Date(now.getFullYear()-1, now.getMonth()+1, 0)
      const prevOrders = ordersList.filter((o:any)=>{ const c=new Date(o.CreatedAt||o.createdAt||o.Created||o.created); return c>=prevStart && c<=prevEnd })
      const prevRevenue = completedRevenue(prevOrders)
      const growth = prevRevenue === 0 ? 0 : Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)

      setSalesData(points)
      setChartSummary({ revenue: currentRevenue, orders: currentOrders, growth })
    }
  }

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      const usersRes = await apiClient.get('/api/users')

      // fetch all orders (admin) to compute totals/status counts
      const ordersRes = await apiClient.get('/api/orders')

      const totalUsers = Array.isArray(usersRes.data)
        ? usersRes.data.length
        : 0

      const orders = Array.isArray(ordersRes.data)
        ? ordersRes.data
        : Array.isArray(ordersRes.data?.data)
        ? ordersRes.data.data
        : []
      // keep full orders list in state for re-computing on filter change
      setOrdersList(orders)
      const totalOrders = orders.length
      const pendingOrders = orders.filter((o: any) => (o.OrderStatus || o.orderStatus || '').toString().toLowerCase() === 'pending approval' || (o.OrderStatus || o.orderStatus || '').toString().toLowerCase() === 'pending').length
      const completedOrders = orders.filter((o: any) => (o.OrderStatus || o.orderStatus || '').toString().toLowerCase() === 'completed').length

      // active users: count where IsActive flag is true (best available indicator)
      const activeUsers = Array.isArray(usersRes.data) ? usersRes.data.filter((u: any) => u.IsActive === 1 || u.IsActive === true).length : 0

      setStats({
        totalUsers,
        totalOrders,
        pendingOrders,
        completedOrders,
        activeUsers,
        systemHealth: 98
      })

      // build sales data for last 7 days and order status breakdown
      // Prepare last 7 days labels (Mon..Sun as T2..CN)
      const days: { date: Date; label: string }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const wd = d.getDay() // 0 Sun .. 6 Sat
        const label = wd === 0 ? 'CN' : `T${wd + 1}`
        days.push({ date: d, label })
      }

      const sales = days.map(({ date, label }) => {
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)

        const dayOrders = orders.filter((o: any) => {
          const created = new Date(o.CreatedAt || o.createdAt || o.Created || o.created)
          return created >= start && created <= end
        })

        const revenue = dayOrders.reduce((sum: number, o: any) => {
          const status = (o.OrderStatus || o.orderStatus || o.Status || o.status || '').toString().toLowerCase()
          return sum + (status === 'completed' ? (Number(o.TotalAmount || o.totalAmount || 0) || 0) : 0)
        }, 0)

        return { day: label, orders: dayOrders.length, revenue }
      })

      // default sales data for 7 days; actual chart will recompute when `chartRange` is applied
      setSalesData(sales)

      const statusCounts: Record<string, number> = {}
      orders.forEach((o: any) => {
        const st = (o.OrderStatus || o.orderStatus || '').toString()
        const key = st.toLowerCase()
        statusCounts[key] = (statusCounts[key] || 0) + 1
      })

      const statusData = [
        { name: 'Hoàn thành', value: statusCounts['completed'] || 0, color: '#43e97b' },
        { name: 'Đang xử lý', value: (statusCounts['pending approval'] || 0) + (statusCounts['pending'] || 0) + (statusCounts['approved'] || 0), color: '#4facfe' },
        { name: 'Đang vận chuyển', value: (statusCounts['sent'] || 0) + (statusCounts['delivered'] || 0) + (statusCounts['uploading'] || 0), color: '#f7b500' },
        { name: 'Hủy', value: (statusCounts['rejected'] || 0) || 0, color: '#f5576c' }
      ]

      setOrderStatusData(statusData)

      // build recent activities from latest users and orders
      const usersList = Array.isArray(usersRes.data) ? usersRes.data : Array.isArray(usersRes.data?.data) ? usersRes.data.data : []

      const userActivities = usersList.slice(0, 10).map((u: any, idx: number) => ({
        id: 1000 + idx,
        type: 'user' as const,
        message: `Người dùng mới: ${u.FullName || u.Username} (${u.Username})`,
        time: u.CreatedAt ? new Date(u.CreatedAt).toLocaleString() : '',
        icon: FiUserPlus,
        createdAt: u.CreatedAt || u.createdAt
      }))

      const orderList = orders

      const orderActivities = orderList.slice(0, 20).map((o: any, idx: number) => ({
        id: 2000 + idx,
        type: 'order' as const,
        message: `Đơn ${o.OrderCode || o.orderCode} (${o.OrderStatus || o.orderStatus})`,
        time: o.CreatedAt ? new Date(o.CreatedAt).toLocaleString() : '',
        icon: FiShoppingCart,
        createdAt: o.CreatedAt || o.createdAt
      }))

      const activitiesAll = [...userActivities, ...orderActivities]
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      setAllActivities(activitiesAll.map((a: any) => ({ id: a.id, type: a.type, message: a.message, time: a.time, icon: a.icon })))
      setRecentActivities(activitiesAll.slice(0, 8).map((a: any) => ({ id: a.id, type: a.type, message: a.message, time: a.time, icon: a.icon })))
    } catch (error) {
      console.error(
        'Lỗi khi lấy dữ liệu dashboard:',
        error
      )
    } finally {
      setLoading(false)
    }
  }

  // `salesData` and `orderStatusData` are populated from API via state

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
                    background: card.gradient,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    // make key cards navigable
                    if (card.title === 'Tổng người dùng') navigate('/admin/users')
                    if (card.title === 'Người dùng hoạt động') navigate('/admin/users')
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  className="chart-filter"
                  value={chartRange}
                  onChange={(e) => setChartRange(e.target.value)}
                >
                  <option value="7ngay">7 ngày</option>
                  <option value="30ngay">30 ngày</option>
                  <option value="1nam">1 năm</option>
                  <option value="custom">Tùy chỉnh</option>
                </select>

                {chartRange === 'custom' && (
                  <div className="chart-custom-inputs">
                    <input
                      type="date"
                      className="chart-date-input"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                    />
                    <span style={{ margin: '0 4px' }}>—</span>
                    <input
                      type="date"
                      className="chart-date-input"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                    />
                  </div>
                )}
                </div>
              </div>

              <div className="chart-stats">
                <div className="chart-stat-box">
                  <h4>Tổng doanh thu</h4>
                  <h3>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(chartSummary.revenue)}</h3>
                  <span>{chartSummary.growth >= 0 ? `+${chartSummary.growth}%` : `${chartSummary.growth}%`}</span>
                </div>

                <div className="chart-stat-box">
                  <h4>Tổng đơn hàng</h4>
                  <h3>{chartSummary.orders}</h3>
                  <span>—</span>
                </div>

                <div className="chart-stat-box">
                  <h4>Tăng trưởng</h4>
                  <h3>{chartSummary.growth}%</h3>
                  <span>so với kỳ trước</span>
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

                <button className="view-all-btn" onClick={() => setShowAllActivities(true)}>
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

            {showAllActivities && (
              <div className="modal-overlay" onClick={() => setShowAllActivities(false)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Hoạt động đầy đủ</h3>
                    <button className="close-btn" onClick={() => setShowAllActivities(false)}>×</button>
                  </div>
                  <div className="modal-body">
                    {allActivities.length === 0 ? (
                      <div>Không có hoạt động</div>
                    ) : (
                      <div className="activities-list-full">
                        {allActivities.map((act) => {
                          const Icon = act.icon
                          return (
                            <div key={act.id} className="activity-item">
                              <div className="activity-icon" style={{ backgroundColor: getActivityIconColor(act.type) }}>
                                <Icon size={16} />
                              </div>
                              <div className="activity-content">
                                <p className="activity-message">{act.message}</p>
                                <span className="activity-time">{act.time}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

                <button
                    className="quick-action-btn secondary"
                    onClick={() =>
                      navigate('/admin/reports')
                    }
                  >
                    <FiFileText size={24} />
                    <span>Xuất báo cáo</span>
                  </button>

                <button
                  className="quick-action-btn success"
                  onClick={() => navigate('/admin/statistics')}
                >
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