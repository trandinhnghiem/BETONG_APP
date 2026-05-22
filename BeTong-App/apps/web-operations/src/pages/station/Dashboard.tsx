import { useEffect, useState } from 'react'

import {
  FiClock,
  FiCheckCircle,
  FiTruck,
  FiPackage,
  FiDollarSign
} from 'react-icons/fi'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts'

import apiClient from '../../services/api'
import './Dashboard.css'

export default function StationDashboard() {

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<any>({})
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [growth, setGrowth] = useState(0)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // ================= COLOR SYNC =================
  const STATUS_COLORS = {
    pending: '#f093fb',
    approved: '#ff6b6b',
    sent: '#4facfe',
    delivered: '#fa709a',
    completed: '#43e97b'
  }

  // ================= LOAD =================
  const fetchData = async () => {
    try {
      setLoading(true)

      const res = await apiClient.get('/api/orders/station-orders')

      const data = Array.isArray(res.data) ? res.data : []

      setOrders(data)
      buildStats(data)
      buildRevenue(data)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    buildRevenue(orders)
  }, [fromDate, toDate, orders])

  // ================= STATS =================
  const buildStats = (data: any[]) => {
    setStats({
      pending: data.filter(o => o.OrderStatus === 'Pending Approval').length,
      approved: data.filter(o => o.OrderStatus === 'Approved').length,
      sent: data.filter(o => o.OrderStatus === 'Sent').length,
      delivered: data.filter(o => o.OrderStatus === 'Delivered').length,
      completed: data.filter(o => o.OrderStatus === 'Completed').length
    })
  }

  // ================= REVENUE =================
  const buildRevenue = (data: any[]) => {
    let filtered = data.filter(o => o.OrderStatus === 'Completed')

    if (fromDate) {
      filtered = filtered.filter(o => new Date(o.CreatedAt) >= new Date(fromDate))
    }

    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(o => new Date(o.CreatedAt) <= end)
    }

    const start = fromDate
      ? new Date(fromDate)
      : (() => {
          const d = new Date()
          d.setDate(d.getDate() - 6)
          return d
        })()

    const end = toDate ? new Date(toDate) : new Date()

    const map: Record<string, number> = {}

    const current = new Date(start)

    while (current <= end) {
      const key = current.toISOString().split('T')[0]
      map[key] = 0
      current.setDate(current.getDate() + 1)
    }

    filtered.forEach(o => {
      const key = new Date(o.CreatedAt).toISOString().split('T')[0]
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

    setGrowth(prev === 0 ? 100 : ((last - prev) / prev) * 100)
  }

  // ================= PIE SYNC COLOR =================
  const pieData = [
  {
    name: 'Chờ duyệt',
    value: stats.pending || 0,
    color: STATUS_COLORS.pending
  },
  {
    name: 'Đã duyệt',
    value: stats.approved || 0,
    color: STATUS_COLORS.approved
  },
  {
    name: 'Đang giao',
    value: stats.sent || 0,
    color: STATUS_COLORS.sent
  },
  {
    name: 'Đã giao',
    value: stats.delivered || 0,
    color: STATUS_COLORS.delivered
  },
  {
    name: 'Hoàn thành',
    value: stats.completed || 0,
    color: STATUS_COLORS.completed
  }
]

  if (loading) return <div className="station-loading">Đang tải...</div>

  const isUp = growth >= 0

  return (
    <div className="station-dashboard">

      {/* HEADER */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard Trạm</h1>
          <p>Phân tích đơn hàng & doanh thu realtime</p>
        </div>
      </div>

      {/* KPI */}
      <div className="station-stats-grid">

        <div className="station-stat-card" style={{ background: STATUS_COLORS.pending }}>
          <FiClock />
          <div>
            <h3>Chờ duyệt</h3>
            <p>{stats.pending}</p>
          </div>
        </div>

        <div className="station-stat-card" style={{ background: STATUS_COLORS.approved }}>
          <FiCheckCircle />
          <div>
            <h3>Đã duyệt</h3>
            <p>{stats.approved}</p>
          </div>
        </div>

        <div className="station-stat-card" style={{ background: STATUS_COLORS.sent }}>
          <FiTruck />
          <div>
            <h3>Đang giao</h3>
            <p>{stats.sent}</p>
          </div>
        </div>

        <div className="station-stat-card" style={{ background: STATUS_COLORS.delivered }}>
          <FiPackage />
          <div>
            <h3>Đã giao</h3>
            <p>{stats.delivered}</p>
          </div>
        </div>

        <div className="station-stat-card" style={{ background: STATUS_COLORS.completed }}>
          <FiCheckCircle />
          <div>
            <h3>Hoàn thành</h3>
            <p>{stats.completed}</p>
          </div>
        </div>

      </div>

      {/* CHART */}
      <div className="station-chart-grid">

        {/* PIE */}
        {/* PIE */}
{/* PIE */}
<div className="station-chart-card">
  <h3>Phân bố đơn hàng</h3>

  <ResponsiveContainer width="100%" height={340}>
    <PieChart>

      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="45%"
        outerRadius={120}
        paddingAngle={0}
        stroke="none"
        labelLine={false}
        label={({ percent = 0 }) =>
          percent > 0
            ? `${(percent * 100).toFixed(0)}%`
            : ''
        }
      >
        {pieData.map((entry, i) => (
          <Cell
            key={i}
            fill={entry.color}
            stroke="none"
          />
        ))}
      </Pie>

      <Tooltip
        formatter={(value: any) => [
          `${value} đơn`,
          'Số lượng'
        ]}
        contentStyle={{
          borderRadius: '12px',
          border: 'none',
          boxShadow:
            '0 6px 20px rgba(0,0,0,0.15)'
        }}
      />

      <Legend
        verticalAlign="bottom"
        align="center"
        iconType="circle"
        formatter={(value) => (
          <span
            style={{
              color: '#374151',
              fontWeight: 600
            }}
          >
            {value}
          </span>
        )}
        wrapperStyle={{
          paddingTop: '20px',
          fontSize: '14px'
        }}
      />

    </PieChart>
  </ResponsiveContainer>
</div>

        {/* LINE */}
        <div className="station-chart-card">

          <div className="station-chart-header">
            <h3>Doanh thu</h3>

            <div className="station-date-filter">
              <input type="date" value={fromDate}
                onChange={e => setFromDate(e.target.value)} />

              <input type="date" value={toDate}
                onChange={e => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="station-kpi-mini">

          <div className="station-kpi-center">
            <FiDollarSign />

            <span>
              {totalRevenue.toLocaleString('vi-VN')} VND
            </span>
          </div>

          <span className={isUp ? 'up' : 'down'}>
            {isUp ? '▲' : '▼'} {growth.toFixed(1)}%
          </span>

        </div>

          <ResponsiveContainer width="100%" height={320}>
  <LineChart data={revenueData}>

    <defs>
      <linearGradient
        id="colorRevenue"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop
          offset="5%"
          stopColor="#1677FF"
          stopOpacity={0.4}
        />

        <stop
          offset="95%"
          stopColor="#1677FF"
          stopOpacity={0}
        />
      </linearGradient>
    </defs>

    <CartesianGrid
      strokeDasharray="3 3"
      vertical={false}
      opacity={0.15}
    />

    <XAxis
      dataKey="date"
      tick={{
        fill: '#6b7280',
        fontSize: 12
      }}
      axisLine={false}
      tickLine={false}
    />

    <YAxis
      tickFormatter={(value) =>
        Number(value).toLocaleString('vi-VN')
      }
      tick={{
        fill: '#6b7280',
        fontSize: 12
      }}
      axisLine={false}
      tickLine={false}
    />

    <Tooltip
      contentStyle={{
        borderRadius: '14px',
        border: 'none',
        boxShadow:
          '0 10px 30px rgba(0,0,0,0.12)'
      }}
      formatter={(value: any) =>
        `${Number(value).toLocaleString(
          'vi-VN'
        )} VND`
      }
    />

    <Line
      type="monotone"
      dataKey="revenue"
      stroke="#1677FF"
      strokeWidth={4}
      dot={{
        r: 5,
        strokeWidth: 2,
        fill: '#fff'
      }}
      activeDot={{
        r: 8
      }}
      fill="url(#colorRevenue)"
    />

  </LineChart>
</ResponsiveContainer>

        </div>

      </div>

    </div>
  )
}