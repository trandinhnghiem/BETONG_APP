import { useEffect, useState } from 'react'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts'

import {
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiDollarSign
} from 'react-icons/fi'

import apiClient from '../../services/api'

import './ReportsPage.css'

export default function CoordinatorReportsPage() {

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [stationData, setStationData] = useState<any[]>([])
  const [revenueTrend, setRevenueTrend] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])

  useEffect(() => {
    fetchReport()
  }, [fromDate, toDate])

  const fetchReport = async () => {

    try {

      setLoading(true)

      const res = await apiClient.get(
        '/api/orders/coordinator-report'
      )

      const data = res.data || []

      let filtered = [...data]

      // FILTER FROM DATE

      if (fromDate) {

        filtered = filtered.filter(
          o =>
            new Date(o.CreatedAt) >=
            new Date(fromDate)
        )
      }

      // FILTER TO DATE

      if (toDate) {

        const end = new Date(toDate)

        end.setHours(23, 59, 59, 999)

        filtered = filtered.filter(
          o =>
            new Date(o.CreatedAt) <= end
        )
      }

      setOrders(filtered)

      buildStationStats(filtered)
      buildRevenueTrend(filtered)
      buildStatusStats(filtered)

    } catch (err) {

      console.error(err)

    } finally {

      setLoading(false)
    }
  }

  // =============================
  // THỐNG KÊ THEO TRẠM
  // =============================

  const buildStationStats = (data: any[]) => {

    const map: any = {}

    data.forEach(order => {

      const station =
        order.DestinationStation || 'Không xác định'

      if (!map[station]) {

        map[station] = {
          station,
          orders: 0,
          revenue: 0
        }
      }

      map[station].orders += 1

      // CHỈ TÍNH DOANH THU ĐƠN COMPLETED

      if (order.OrderStatus === 'Completed') {
        map[station].revenue += order.TotalAmount || 0
      }
    })

    setStationData(Object.values(map))
  }

  // =============================
  // BIẾN ĐỘNG DOANH THU
  // =============================

  const buildRevenueTrend = (data: any[]) => {

    const map: any = {}

    data.forEach(order => {

      // CHỈ TÍNH ĐƠN COMPLETED

      if (order.OrderStatus !== 'Completed') return

      const date = new Date(order.CreatedAt)
        .toISOString()
        .split('T')[0]

      if (!map[date]) {
        map[date] = 0
      }

      map[date] += order.TotalAmount || 0
    })

    const chart = Object.keys(map).map(date => ({
      date,
      revenue: map[date]
    }))

    setRevenueTrend(chart)
  }

  // =============================
  // THỐNG KÊ TRẠNG THÁI
  // =============================

  const buildStatusStats = (data: any[]) => {

    const statuses = [
      'Pending Approval',
      'Approved',
      'Sent',
      'Delivered',
      'Completed',
      'Rejected'
    ]

    const chart = statuses.map(status => ({
      name: status,
      value: data.filter(
        o => o.OrderStatus === status
      ).length
    }))

    setStatusData(chart)
  }

  const COLORS = [
    '#ff6b6b',
    '#4facfe',
    '#fa8c16',
    '#13c2c2',
    '#52c41a',
    '#722ed1'
  ]

  if (loading) {
    return <div className="loading">Đang tải...</div>
  }

  return (
    <div className="coordinator-reports">

      {/* HEADER */}

      <div className="report-header">

        <h1>Báo cáo điều phối</h1>

        <p>
          Theo dõi hoạt động đơn hàng,
          doanh thu và hiệu suất các trạm
        </p>

      </div>

      {/* FILTER */}

      <div className="filter-bar">

        <div className="filter-item">

          <label>Từ ngày</label>

          <input
            type="date"
            value={fromDate}
            onChange={(e) =>
              setFromDate(e.target.value)
            }
          />

        </div>

        <div className="filter-item">

          <label>Đến ngày</label>

          <input
            type="date"
            value={toDate}
            onChange={(e) =>
              setToDate(e.target.value)
            }
          />

        </div>

      </div>

      {/* KPI */}

      <div className="kpi-grid">

        <div className="kpi-card blue">

          <div className="kpi-icon">
            <FiTruck />
          </div>

          <h3>Tổng đơn</h3>

          <p>{orders.length}</p>

        </div>

        <div className="kpi-card green">

          <div className="kpi-icon">
            <FiCheckCircle />
          </div>

          <h3>Hoàn thành</h3>

          <p>
            {
              orders.filter(
                o => o.OrderStatus === 'Completed'
              ).length
            }
          </p>

        </div>

        <div className="kpi-card orange">

          <div className="kpi-icon">
            <FiClock />
          </div>

          <h3>Đang vận chuyển</h3>

          <p>
            {
              orders.filter(
                o =>
                  o.OrderStatus === 'Sent' ||
                  o.OrderStatus === 'Delivered'
              ).length
            }
          </p>

        </div>

        <div className="kpi-card purple">

          <div className="kpi-icon">
            <FiDollarSign />
          </div>

          <h3>Doanh thu</h3>

          <p>
            {
              orders
                .filter(
                  o => o.OrderStatus === 'Completed'
                )
                .reduce(
                  (s, o) =>
                    s + (o.TotalAmount || 0),
                  0
                )
                .toLocaleString()
            } đ
          </p>

        </div>

      </div>

      {/* CHARTS */}

      <div className="chart-grid">

        {/* PIE */}

        <div className="chart-card">

          <h3>Tỷ lệ trạng thái đơn hàng</h3>

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

                {
                  statusData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i]}
                    />
                  ))
                }

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

        {/* BAR */}

        <div className="chart-card">

          <h3>Doanh thu theo trạm</h3>

          <ResponsiveContainer
            width="100%"
            height={350}
          >

            <BarChart data={stationData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="station" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="revenue"
                fill="#1677ff"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* LINE */}

      <div className="chart-card">

        <h3>Biến động doanh thu</h3>

        <ResponsiveContainer
          width="100%"
          height={350}
        >

          <LineChart data={revenueTrend}>

            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis dataKey="date" />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#52c41a"
              strokeWidth={3}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

      {/* TOP STATIONS */}

      <div className="chart-card">

        <h3>Top trạm hoạt động</h3>

        <div className="top-stations">

          {
            [...stationData]
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 3)
              .map((station, index) => (

                <div
                  key={index}
                  className="top-station-card"
                >

                  <div className="rank">
                    #{index + 1}
                  </div>

                  <div>

                    <h4>{station.station}</h4>

                    <p>
                      {station.orders} đơn
                    </p>

                  </div>

                  <div className="money">

                    {station.revenue.toLocaleString()} đ

                  </div>

                </div>
              ))
          }

        </div>

      </div>

      {/* TABLE */}

      <div className="chart-card">

        <h3>Hiệu suất các trạm</h3>

        <table className="report-table">

          <thead>
            <tr>
              <th>Trạm</th>
              <th>Số đơn</th>
              <th>Doanh thu</th>
            </tr>
          </thead>

          <tbody>

            {
              stationData.map((s, i) => (

                <tr key={i}>

                  <td>{s.station}</td>

                  <td>{s.orders}</td>

                  <td>
                    {s.revenue.toLocaleString()} đ
                  </td>

                </tr>
              ))
            }

          </tbody>

        </table>

      </div>

      {/* PROGRESS */}

      <div className="chart-card">

        <h3>Tiến độ trạng thái đơn</h3>

        <div className="progress-list">

          {
            statusData.map((s, index) => (

              <div
                className="progress-item"
                key={index}
              >

                <div className="progress-top">

                  <span>{s.name}</span>

                  <span>{s.value}</span>

                </div>

                <div className="progress-bar">

                  <div
                    className="progress-fill"
                    style={{
                      width: `${

                        orders.length
                          ? (s.value / orders.length) * 100
                          : 0

                      }%`
                    }}
                  />

                </div>

              </div>
            ))
          }

        </div>

      </div>

    </div>
  )
}