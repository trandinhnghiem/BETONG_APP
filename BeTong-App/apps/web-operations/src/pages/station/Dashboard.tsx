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
  CartesianGrid
} from 'recharts'

import apiClient from '../../services/api'
import socket from '../../socket'

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

  

  // ================= LOAD DATA =================
  const fetchData = async () => {
    try {
      setLoading(true)

      const res = await apiClient.get(
        '/api/orders/station-orders'
      )

      const data = Array.isArray(res.data)
        ? res.data
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
  }, [])

  // ================= FILTER DATE =================
  useEffect(() => {
    buildRevenue(orders)
  }, [fromDate, toDate, orders])

  // ================= SOCKET =================
  

  // ================= STATS =================
  const buildStats = (data: any[]) => {

    setStats({
      pending: data.filter(
        o => o.OrderStatus === 'Pending Approval'
      ).length,

      approved: data.filter(
        o => o.OrderStatus === 'Approved'
      ).length,

      sent: data.filter(
        o => o.OrderStatus === 'Sent'
      ).length,

      delivered: data.filter(
        o => o.OrderStatus === 'Delivered'
      ).length,

      completed: data.filter(
        o => o.OrderStatus === 'Completed'
      ).length
    })
  }

  // ================= REVENUE =================
  const buildRevenue = (data: any[]) => {

    let filtered = data.filter(
      o => o.OrderStatus === 'Completed'
    )

    // from
    if (fromDate) {
      filtered = filtered.filter(
        o =>
          new Date(o.CreatedAt) >=
          new Date(fromDate)
      )
    }

    // to
    if (toDate) {

      const end = new Date(toDate)

      end.setHours(23, 59, 59, 999)

      filtered = filtered.filter(
        o =>
          new Date(o.CreatedAt) <= end
      )
    }

    // default 7 days
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

      current.setDate(
        current.getDate() + 1
      )
    }

    filtered.forEach(o => {

      const key = new Date(o.CreatedAt)
        .toISOString()
        .split('T')[0]

      if (map[key] !== undefined) {
        map[key] += o.TotalAmount || 0
      }
    })

    const chart = Object.keys(map).map(
      date => ({
        date,
        revenue: map[date]
      })
    )

    setRevenueData(chart)

    const total = chart.reduce(
      (sum, item) =>
        sum + item.revenue,
      0
    )

    setTotalRevenue(total)

    const last =
      chart[chart.length - 1]?.revenue || 0

    const prev =
      chart[chart.length - 2]?.revenue || 0

    const percent =
      prev === 0
        ? 100
        : ((last - prev) / prev) * 100

    setGrowth(percent)
  }

  // ================= PIE =================
  const pieData = [
    {
      name: 'Pending',
      value: stats.pending || 0
    },
    {
      name: 'Approved',
      value: stats.approved || 0
    },
    {
      name: 'Sent',
      value: stats.sent || 0
    },
    {
      name: 'Delivered',
      value: stats.delivered || 0
    },
    {
      name: 'Completed',
      value: stats.completed || 0
    }
  ]

  const COLORS = [
    '#ff6b6b',
    '#4facfe',
    '#52c41a',
    '#fa8c16',
    '#722ed1'
  ]

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="loading">
        Đang tải...
      </div>
    )
  }

  const isUp = growth >= 0

  return (
    <div className="station-dashboard">

      {/* HEADER */}
      <div className="page-header">

          <div>
            <h1>Dashboard Trạm</h1>

            <p>
              Phân tích đơn hàng &
              doanh thu theo thời gian thực
            </p>
          </div>

          </div>

      {/* KPI */}
      <div className="station-stats-grid">

        <div className="station-stat-card station-stat-card--warning">
          <FiClock />
          <h3>Chờ duyệt</h3>
          <p>{stats.pending}</p>
        </div>

        <div className="station-stat-card station-stat-card--primary">
          <FiCheckCircle />
          <h3>Đã duyệt</h3>
          <p>{stats.approved}</p>
        </div>

        <div className="station-stat-card station-stat-card--info">
          <FiTruck />
          <h3>Đang giao</h3>
          <p>{stats.sent}</p>
        </div>

        <div className="station-stat-card station-stat-card--accent">
          <FiPackage />
          <h3>Đã giao</h3>
          <p>{stats.delivered}</p>
        </div>

        <div className="station-stat-card station-stat-card--success">
          <FiCheckCircle />
          <h3>Hoàn thành</h3>
          <p>{stats.completed}</p>
        </div>

      </div>

      {/* CHART */}
      <div className="station-chart-grid">

        {/* PIE */}
        <div className="station-chart-card">

          <h3>Phân bố đơn hàng</h3>

          <ResponsiveContainer
            width="100%"
            height={320}
          >
            <PieChart>

              <Pie
                data={pieData}
                dataKey="value"
                outerRadius={120}
              >
                {pieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i]}
                  />
                ))}
              </Pie>

              <Tooltip />

            </PieChart>
          </ResponsiveContainer>

        </div>

        {/* LINE */}
        <div className="station-chart-card">

          <div className="station-chart-header">

            <h3>Doanh thu</h3>

            <div className="station-date-filter">

              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
              />

              <input
                type="date"
                value={toDate}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
              />

            </div>
          </div>

          <div className="station-kpi-mini">

            <FiDollarSign />

            <span>
              {totalRevenue.toLocaleString()} VND
            </span>

            <span
              className={
                isUp ? 'up' : 'down'
              }
            >
              {isUp ? '▲' : '▼'}{' '}
              {growth.toFixed(1)}%
            </span>

          </div>

          <ResponsiveContainer
            width="100%"
            height={280}
          >

            <LineChart data={revenueData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="date" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1677FF"
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>

    </div>
  )
}