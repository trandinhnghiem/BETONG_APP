import { useEffect, useState } from 'react'
import {
  FiClock,
  FiCheckCircle,
  FiTruck,
  FiPackage,
  FiDollarSign
} from 'react-icons/fi'
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts'
import apiClient from '../../services/api'
import './StationDashboard.css'

export default function StationDashboard() {

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<any>({})
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [growth, setGrowth] = useState(0)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    fetchData()
  }, [])
  useEffect(() => {
  buildRevenue(orders)
}, [fromDate, toDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/api/orders/station-orders')
      const data = res.data || []

      setOrders(data)
      buildStats(data)
      buildRevenue(data)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const buildStats = (data: any[]) => {
    setStats({
      pending: data.filter(o => o.OrderStatus === 'Pending Approval').length,
      approved: data.filter(o => o.OrderStatus === 'Approved').length,
      sent: data.filter(o => o.OrderStatus === 'Sent').length,
      delivered: data.filter(o => o.OrderStatus === 'Delivered').length,
      completed: data.filter(o => o.OrderStatus === 'Completed').length,
    })
  }

  const buildRevenue = (data: any[]) => {

  let filtered = [...data]

  // FILTER DATE
  if (fromDate) {
    filtered = filtered.filter(o =>
      new Date(o.CreatedAt) >= new Date(fromDate)
    )
  }

  if (toDate) {
    const end = new Date(toDate)
    end.setHours(23, 59, 59, 999)

    filtered = filtered.filter(o =>
      new Date(o.CreatedAt) <= end
    )
  }

  // ===== DATE RANGE =====

  const start = fromDate
    ? new Date(fromDate)
    : (() => {
        const d = new Date()
        d.setDate(d.getDate() - 6)
        return d
      })()

  const end = toDate
    ? new Date(toDate)
    : new Date()

  const map: any = {}

  // INIT ALL DAYS = 0
  const current = new Date(start)

  while (current <= end) {

    const key = current.toISOString().split('T')[0]

    map[key] = 0

    current.setDate(current.getDate() + 1)
  }

  // ADD REVENUE
  filtered.forEach(o => {

    if (!o.CreatedAt) return

    const key = new Date(o.CreatedAt)
      .toISOString()
      .split('T')[0]

    if (map[key] !== undefined) {
      map[key] += o.TotalAmount || 0
    }
  })

  const chart = Object.keys(map).map(date => ({
    date,
    revenue: map[date]
  }))

  setRevenueData(chart)

  const total = chart.reduce((s, i) => s + i.revenue, 0)

  setTotalRevenue(total)

  const last = chart[chart.length - 1]?.revenue || 0
  const prev = chart[chart.length - 2]?.revenue || 0

  const percent =
    prev === 0
      ? 100
      : ((last - prev) / prev) * 100

  setGrowth(percent)
}
  const pieData = [
    { name: 'Pending', value: stats.pending || 0 },
    { name: 'Approved', value: stats.approved || 0 },
    { name: 'Sent', value: stats.sent || 0 },
    { name: 'Delivered', value: stats.delivered || 0 },
    { name: 'Completed', value: stats.completed || 0 },
  ]

  const COLORS = ['#ff6b6b', '#4facfe', '#52c41a', '#fa8c16', '#722ed1']

  if (loading) return <div className="loading">Đang tải...</div>

  const isUp = growth >= 0

  return (
    <div className="station-dashboard">

      {/* HEADER */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard Trạm</h1>
          <p>Phân tích đơn hàng & doanh thu theo thời gian thực</p>
        </div>
      </div>

      {/* KPI */}
      <div className="stats-grid">

        <div className="stat-card stat-card--warning">
          <div className="stat-icon"><FiClock /></div>
          <div className="stat-content">
            <h3>Chờ duyệt</h3>
            <p className="stat-value">{stats.pending}</p>
          </div>
        </div>

        <div className="stat-card stat-card--primary">
          <div className="stat-icon"><FiCheckCircle /></div>
          <div className="stat-content">
            <h3>Đã duyệt</h3>
            <p className="stat-value">{stats.approved}</p>
          </div>
        </div>

        <div className="stat-card stat-card--info">
          <div className="stat-icon"><FiTruck /></div>
          <div className="stat-content">
            <h3>Đang giao</h3>
            <p className="stat-value">{stats.sent}</p>
          </div>
        </div>

        <div className="stat-card stat-card--accent">
          <div className="stat-icon"><FiPackage /></div>
          <div className="stat-content">
            <h3>Đã giao</h3>
            <p className="stat-value">{stats.delivered}</p>
          </div>
        </div>

        <div className="stat-card stat-card--success">
          <div className="stat-icon"><FiCheckCircle /></div>
          <div className="stat-content">
            <h3>Hoàn thành</h3>
            <p className="stat-value">{stats.completed}</p>
          </div>
        </div>

      </div>

      {/* CHART */}
      <div className="chart-grid">

        {/* PIE */}
        <div className="chart-card">
          <h3>Phân bố đơn hàng</h3>

          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                outerRadius={120}
                innerRadius={0}
                label={({ name, percent = 0 }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* LINE */}
        <div className="chart-card">
          <div className="chart-header">

  <h3>Phân tích doanh thu</h3>

  <div className="date-filter">

    <input
      type="date"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
    />

    <span>-</span>

    <input
      type="date"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
    />

  </div>

</div>

          <div className="kpi-mini">
            <div>
              <FiDollarSign />
              <span>{totalRevenue.toLocaleString()} VND</span>
            </div>

            <div className={isUp ? "up" : "down"}>
              {isUp ? "▲" : "▼"} {growth.toFixed(1)}%
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit'
                  })
                }
              />

              <YAxis />
              <Tooltip />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1677FF"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>

        </div>

      </div>

    </div>
  )
}