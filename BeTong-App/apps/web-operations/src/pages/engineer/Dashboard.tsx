import { useEffect, useState } from 'react'

import {
  FiClock,
  FiCheckCircle,
  FiTruck,
  FiPackage,
  FiDollarSign,
  FiClipboard
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

interface EngineerOrder {
  id: number
  orderCode: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  rejectReason?: string
  createdAt: string
}

export default function EngineerDashboard() {
  const [orders, setOrders] = useState<EngineerOrder[]>([])
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    sent: 0,
    delivered: 0,
    completed: 0,
    totalOrders: 0,
    totalAmount: 0
  })

  const [revenueData, setRevenueData] = useState<any[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [growth, setGrowth] = useState(0)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // ================= NORMALIZE STATUS =================
  const normalizeStatus = (
    status: string | undefined | null
  ): string => {
    if (!status) return ''

    switch (status) {
      case 'Processing':
        return 'Sent'

      case 'Delivering':
        return 'Delivered'

      default:
        return status
    }
  }

  // ================= VN DATE =================
  const toVNDate = (date: string) => {
    const d = new Date(date)
    d.setHours(d.getHours() - 7)
    return d
  }

  // ================= COLORS =================
  const STATUS_COLORS = {
    pending: '#f093fb',
    approved: '#ff6b6b',
    sent: '#4facfe',
    delivered: '#fa709a',
    completed: '#43e97b'
  }

  // ================= FETCH =================
  const fetchData = async () => {
    try {
      setLoading(true)

      const res = await apiClient.get(
        '/api/orders/engineer-orders'
      )

      const data: EngineerOrder[] = Array.isArray(res.data)
        ? res.data.map((o: any) => ({
            id: o.Id,
            orderCode: o.OrderCode,
            destinationStation: o.DestinationStation,
            totalAmount: Number(o.TotalAmount || 0),
            orderStatus: o.OrderStatus,
            rejectReason: o.RejectReason,
            createdAt: o.CreatedAt
          }))
        : []

      setOrders(data)

      buildStats(data)
      buildRevenue(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ================= INIT =================
  useEffect(() => {
    fetchData()

    const interval = setInterval(() => {
      fetchData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // ================= FILTER DATE =================
  useEffect(() => {
    buildRevenue(orders)
  }, [fromDate, toDate, orders])

  // ================= STATS =================
  const buildStats = (data: EngineerOrder[]) => {
    setStats({
      pending: data.filter(
        o =>
          normalizeStatus(o.orderStatus) ===
          'Pending Approval'
      ).length,

      approved: data.filter(
        o =>
          normalizeStatus(o.orderStatus) ===
          'Approved'
      ).length,

      sent: data.filter(
        o =>
          normalizeStatus(o.orderStatus) ===
          'Sent'
      ).length,

      delivered: data.filter(
        o =>
          normalizeStatus(o.orderStatus) ===
          'Delivered'
      ).length,

      completed: data.filter(
        o =>
          normalizeStatus(o.orderStatus) ===
          'Completed'
      ).length,

      totalOrders: data.length,

      totalAmount: data.reduce(
        (sum, o) =>
          sum + Number(o.totalAmount || 0),
        0
      )
    })
  }

  // ================= REVENUE =================
  const buildRevenue = (data: EngineerOrder[]) => {
    let filtered = data.filter(
      o =>
        normalizeStatus(o.orderStatus) ===
        'Completed'
    )

    if (fromDate) {
      filtered = filtered.filter(
        o =>
          toVNDate(o.createdAt) >=
          new Date(fromDate)
      )
    }

    if (toDate) {
      const end = new Date(toDate)

      end.setHours(23, 59, 59, 999)

      filtered = filtered.filter(
        o => toVNDate(o.createdAt) <= end
      )
    }

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

    const map: Record<string, number> = {}

    const current = new Date(start)

    while (current <= end) {
      const key = current
        .toISOString()
        .split('T')[0]

      map[key] = 0

      current.setDate(current.getDate() + 1)
    }

    filtered.forEach(o => {
      const key = toVNDate(o.createdAt)
        .toISOString()
        .split('T')[0]

      if (map[key] !== undefined) {
        map[key] += Number(o.totalAmount || 0)
      }
    })

    const chart = Object.keys(map).map(date => ({
      date: new Date(date).toLocaleDateString(
        'vi-VN'
      ),
      revenue: map[date]
    }))

    setRevenueData(chart)

    const total = chart.reduce(
      (sum, item) => sum + item.revenue,
      0
    )

    setTotalRevenue(total)

    const last =
      chart[chart.length - 1]?.revenue || 0

    const prev =
      chart[chart.length - 2]?.revenue || 0

    setGrowth(
      prev === 0
        ? last > 0
          ? 100
          : 0
        : ((last - prev) / prev) * 100
    )
  }

  // ================= PIE DATA =================
  const pieData = [
    {
      name: 'Chờ duyệt',
      value: stats.pending,
      color: STATUS_COLORS.pending
    },

    {
      name: 'Đã duyệt',
      value: stats.approved,
      color: STATUS_COLORS.approved
    },

    {
      name: 'Đang giao',
      value: stats.sent,
      color: STATUS_COLORS.sent
    },

    {
      name: 'Đã giao',
      value: stats.delivered,
      color: STATUS_COLORS.delivered
    },

    {
      name: 'Hoàn thành',
      value: stats.completed,
      color: STATUS_COLORS.completed
    }
  ]

  if (loading) {
    return (
      <div className="engineer-loading">
        Đang tải...
      </div>
    )
  }

  const isUp = growth >= 0

  return (
    <div className="engineer-dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard Kỹ sư</h1>

          <p>
            Phân tích đơn hàng & doanh thu
            realtime
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="engineer-stats-grid">
        <div
          className="engineer-stat-card"
          style={{
            background: STATUS_COLORS.pending
          }}
        >
          <FiClock />

          <div>
            <h3>Chờ duyệt</h3>
            <p>{stats.pending}</p>
          </div>
        </div>

        <div
          className="engineer-stat-card"
          style={{
            background: STATUS_COLORS.approved
          }}
        >
          <FiCheckCircle />

          <div>
            <h3>Đã duyệt</h3>
            <p>{stats.approved}</p>
          </div>
        </div>

        <div
          className="engineer-stat-card"
          style={{
            background: STATUS_COLORS.sent
          }}
        >
          <FiTruck />

          <div>
            <h3>Đang giao</h3>
            <p>{stats.sent}</p>
          </div>
        </div>

        <div
          className="engineer-stat-card"
          style={{
            background: STATUS_COLORS.delivered
          }}
        >
          <FiPackage />

          <div>
            <h3>Đã giao</h3>
            <p>{stats.delivered}</p>
          </div>
        </div>

        <div
          className="engineer-stat-card"
          style={{
            background: STATUS_COLORS.completed
          }}
        >
          <FiCheckCircle />

          <div>
            <h3>Hoàn thành</h3>
            <p>{stats.completed}</p>
          </div>
        </div>

        <div
          className="engineer-stat-card"
          style={{
            background:
              'linear-gradient(135deg,#0f172a,#1e293b)'
          }}
        >
          <FiClipboard />

          <div>
            <h3>Tổng đơn</h3>
            <p>{stats.totalOrders}</p>
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="engineer-chart-grid">
        {/* PIE */}
        <div className="engineer-chart-card">
          <h3>Phân bố đơn hàng</h3>

          <ResponsiveContainer
            width="100%"
            height={340}
          >
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={120}
                stroke="none"
                label={({ percent = 0 }) =>
                  percent > 0
                    ? `${(
                        percent * 100
                      ).toFixed(0)}%`
                    : ''
                }
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                  />
                ))}
              </Pie>

              <Tooltip />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* LINE */}
        <div className="engineer-chart-card">
          <div className="engineer-chart-header">
            <h3>Doanh thu</h3>

            <div className="engineer-date-filter">
              <input
                type="date"
                value={fromDate}
                onChange={e =>
                  setFromDate(e.target.value)
                }
              />

              <input
                type="date"
                value={toDate}
                onChange={e =>
                  setToDate(e.target.value)
                }
              />
            </div>
          </div>

          <div className="engineer-kpi-mini">
            <div className="engineer-kpi-center">
              <FiDollarSign />

              <span>
                {totalRevenue.toLocaleString(
                  'vi-VN'
                )}{' '}
                VND
              </span>
            </div>

            <span className={isUp ? 'up' : 'down'}>
              {isUp ? '▲' : '▼'}{' '}
              {growth.toFixed(1)}%
            </span>
          </div>

          {revenueData.length === 0 ? (
            <div className="empty-chart">
              Không có dữ liệu doanh thu
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1677FF"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}