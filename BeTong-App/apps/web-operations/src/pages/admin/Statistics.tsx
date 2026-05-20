import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts'

import apiClient from '../../services/api'
import './Statistics.css'

type SalesDataType = {
  month: string
  revenue: number
  date?: string
}

type StatusDataType = {
  name: string
  value: number
  color: string
}

export default function Statistics() {

  const [salesData, setSalesData] =
    useState<SalesDataType[]>([])

  const [allSalesData, setAllSalesData] =
    useState<SalesDataType[]>([])

  const [statusData, setStatusData] =
    useState<StatusDataType[]>([])

  const [summary, setSummary] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    growth: 0
  })

  const [filterType, setFilterType] =
    useState('7days')

  const [fromDate, setFromDate] =
    useState('')

  const [toDate, setToDate] =
    useState('')

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {

      const res =
        await apiClient.get('/api/statistics')

      setSalesData(res.data.salesData)

      setAllSalesData(res.data.salesData)

      setStatusData(res.data.statusData)

      setSummary(res.data.summary)

    } catch (err) {
      console.error(err)
    }
  }

  // =========================
  // FILTER BUTTON
  // =========================

  const handleFilter = (type: string) => {

    setFilterType(type)

    let filtered = [...allSalesData]

    if (type === '7days') {

      filtered = allSalesData.slice(-7)

    } else if (type === '30days') {

      filtered = allSalesData.slice(-30)

    } else if (type === '1year') {

      filtered = allSalesData

    }

    setSalesData(filtered)
  }

  // =========================
  // CUSTOM DATE FILTER
  // =========================

  const handleCustomFilter = () => {

    if (!fromDate || !toDate) return

    const from = new Date(fromDate)

    const to = new Date(toDate)

    const filtered = allSalesData.filter(
      (item) => {

        if (!item.date) return false

        const itemDate =
          new Date(item.date)

        return (
          itemDate >= from &&
          itemDate <= to
        )
      }
    )

    setSalesData(filtered)
  }

  return (

    <div className="statistics-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="statistics-header">

        <div>
          <h1>Quản lý thống kê</h1>

          <p>
            Theo dõi doanh thu,
            hiệu suất và dữ liệu
            vận hành hệ thống
          </p>
        </div>

        <div className="header-right">

          <div className="live-badge">
            <span></span>
            Live Data
          </div>

        </div>

      </div>

      {/* =========================
          FILTER BAR
      ========================= */}

      <div className="filter-bar">

        <button
          className={
            filterType === '7days'
              ? 'active'
              : ''
          }
          onClick={() =>
            handleFilter('7days')
          }
        >
          7 ngày
        </button>

        <button
          className={
            filterType === '30days'
              ? 'active'
              : ''
          }
          onClick={() =>
            handleFilter('30days')
          }
        >
          30 ngày
        </button>

        <button
          className={
            filterType === '1year'
              ? 'active'
              : ''
          }
          onClick={() =>
            handleFilter('1year')
          }
        >
          1 năm
        </button>

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

        <button
          onClick={handleCustomFilter}
        >
          Áp dụng
        </button>

      </div>

      {/* =========================
          KPI CARDS
      ========================= */}

      <div className="stats-cards">

        <div className="stats-card revenue">

          <div className="stats-top">

            <span>Tổng doanh thu</span>

            <div className="stats-icon">
              💰
            </div>

          </div>

          <h2>
            {summary.revenue.toLocaleString('vi-VN')}đ
          </h2>

          <p>+18% so với tháng trước</p>

        </div>

        <div className="stats-card orders">

          <div className="stats-top">

            <span>Tổng đơn hàng</span>

            <div className="stats-icon">
              📦
            </div>

          </div>

          <h2>{summary.orders}</h2>

          <p>Đơn hàng đã xử lý</p>

        </div>

        <div className="stats-card customers">

          <div className="stats-top">

            <span>Khách hàng</span>

            <div className="stats-icon">
              👥
            </div>

          </div>

          <h2>{summary.customers}</h2>

          <p>Khách hàng hoạt động</p>

        </div>

        <div className="stats-card growth">

          <div className="stats-top">

            <span>Tăng trưởng</span>

            <div className="stats-icon">
              📈
            </div>

          </div>

          <h2>+{summary.growth}%</h2>

          <p>Tăng trưởng doanh thu</p>

        </div>

      </div>

      {/* =========================
          CHARTS
      ========================= */}

      <div className="statistics-grid">

        {/* REVENUE CHART */}

        <div className="statistics-card large">

          <h2>
            Doanh thu theo thời gian
          </h2>

          <ResponsiveContainer
  width="100%"
  height={450}
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
          offset="5%"
          stopColor="#435ebe"
          stopOpacity={0.35}
        />

        <stop
          offset="95%"
          stopColor="#435ebe"
          stopOpacity={0}
        />

      </linearGradient>

    </defs>

    <CartesianGrid
      strokeDasharray="3 3"
      opacity={0.08}
    />

    <XAxis
      dataKey="month"
      stroke="#94a3b8"
    />

    <YAxis
      stroke="#94a3b8"
    />

    <Tooltip
      contentStyle={{
        borderRadius: '16px',
        border: 'none',
        boxShadow:
          '0 10px 30px rgba(0,0,0,0.1)'
      }}
    />

    <Area
      type="monotone"
      dataKey="revenue"
      stroke="#435ebe"
      strokeWidth={4}
      fill="url(#colorRevenue)"
      dot={false}
    />

  </AreaChart>

</ResponsiveContainer>

        </div>

        {/* PIE CHART */}

        <div className="statistics-card">

          <h2>Trạng thái đơn hàng</h2>

          <ResponsiveContainer
            width="100%"
            height={350}
          >

            <PieChart>

              <Pie
                data={statusData}
                dataKey="value"
                outerRadius={120}
                label
              >

                {statusData.map(
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

      </div>

    </div>
  )
}