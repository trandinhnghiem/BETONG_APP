import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import apiClient from '../../services/api'
import './StationDashboard.css'

export default function StationDashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    sent: 0,
    delivered: 0,
    completed: 0
  })
  const [loading, setLoading] = useState(true)
  const [stationName, setStationName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const userRole = localStorage.getItem('userRole')
      const stationIdStr = localStorage.getItem('stationId')

<<<<<<< HEAD
      // Tính số liệu từ orders của trạm này
      const pending = orders.filter((o: any) => o.OrderStatus === 'Pending Approval').length
      const approved = orders.filter((o: any) => o.OrderStatus === 'Approved').length
      const sent = orders.filter((o: any) => o.OrderStatus === 'Sent').length
      const delivered = orders.filter((o: any) => o.OrderStatus === 'Delivered').length
      const completed = orders.filter((o: any) => o.OrderStatus === 'Completed').length

      setStats({ pending, approved, sent, delivered, completed })

      // Lấy tên trạm từ đơn đầu tiên (nếu có)
      if (orders.length > 0) {
        setStationName(orders[0].DestinationStationName || 'Trạm của bạn')
      } else {
        setStationName('Trạm của bạn')
=======
      if (userRole === 'Station' && stationIdStr) {
        // For station users, backend `GET /api/orders/station-orders` already returns orders for their station.
        const res = await apiClient.get('/api/orders/station-orders')
        const orders = res.data || []

        // Lookup station name by ID
        let stationName = ''
        try {
          const stationsRes = await apiClient.get('/api/orders/stations')
          const stations = stationsRes.data || []
          const sid = parseInt(stationIdStr)
          const st = stations.find((s: any) => s.Id === sid || s.id === sid)
          stationName = st ? (st.StationName || st.stationName || '') : ''
        } catch (err) {
          console.warn('Could not fetch stations list', err)
        }

        const count = orders.filter((o: any) => (o.OrderStatus || o.orderStatus || '').toString().toLowerCase() === 'sent').length
        setStations([{ name: stationName || 'Trạm của bạn', count }])
      } else {
        const res = await apiClient.get('/api/orders/station-orders')
        const orders = res.data || []

        const result = stationList.map(name => {
          const count = orders.filter((o: any) =>
            o.DestinationStation === name && o.OrderStatus === 'Sent'
          ).length

          return { name, count }
        })

        setStations(result)
>>>>>>> UPDATE-BY-THONG
      }

    } catch (err) {
      console.error(err)
      setStats({ pending: 0, approved: 0, sent: 0, delivered: 0, completed: 0 })
    } finally {
      setLoading(false)
    }
  }

<<<<<<< HEAD
  const goToOrders = () => {
    navigate('/station/orders')
=======
  const goToStation = (name: string) => {
    const userRole = localStorage.getItem('userRole')
    if (userRole === 'Station') {
      window.location.href = '/station/orders'
    } else {
      window.location.href = `/station-orders?station=${encodeURIComponent(name)}`
    }
>>>>>>> UPDATE-BY-THONG
  }

  // Data cho biểu đồ
  const pieData = [
    { name: 'Chờ xác nhận', value: stats.pending, color: '#ffc107' },
    { name: 'Đã xác nhận', value: stats.approved, color: '#28a745' },
    { name: 'Đang giao', value: stats.sent, color: '#007bff' },
    { name: 'Đã giao', value: stats.delivered, color: '#17a2b8' },
    { name: 'Hoàn thành', value: stats.completed, color: '#6c757d' }
  ].filter(item => item.value > 0)

  const barData = [
    { name: 'Chờ xác nhận', count: stats.pending },
    { name: 'Đã xác nhận', count: stats.approved },
    { name: 'Đang giao', count: stats.sent },
    { name: 'Đã giao', count: stats.delivered },
    { name: 'Hoàn thành', count: stats.completed }
  ] as const

  return (
    <div className="station-dashboard">
      <div className="dashboard-header">
        <h1>🏭 Dashboard {stationName}</h1>
        <p>Quản lý đơn hàng tại trạm của bạn</p>
        <button onClick={goToOrders} className="view-orders-btn">
          📋 Xem đơn hàng
        </button>
      </div>

      {loading ? (
        <div className="loading">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card pending">
              <h3>Chờ xác nhận</h3>
              <p className="count">{stats.pending}</p>
              <div className="progress-bar">
                <div className="progress" style={{width: `${stats.pending > 0 ? 100 : 0}%`, backgroundColor: '#ffc107'}}></div>
              </div>
            </div>
            <div className="stat-card approved">
              <h3>Đã xác nhận</h3>
              <p className="count">{stats.approved}</p>
              <div className="progress-bar">
                <div className="progress" style={{width: `${stats.approved > 0 ? 100 : 0}%`, backgroundColor: '#28a745'}}></div>
              </div>
            </div>
            <div className="stat-card sent">
              <h3>Đang giao</h3>
              <p className="count">{stats.sent}</p>
              <div className="progress-bar">
                <div className="progress" style={{width: `${stats.sent > 0 ? 100 : 0}%`, backgroundColor: '#007bff'}}></div>
              </div>
            </div>
            <div className="stat-card delivered">
              <h3>Đã giao</h3>
              <p className="count">{stats.delivered}</p>
              <div className="progress-bar">
                <div className="progress" style={{width: `${stats.delivered > 0 ? 100 : 0}%`, backgroundColor: '#17a2b8'}}></div>
              </div>
            </div>
            <div className="stat-card completed">
              <h3>Hoàn thành</h3>
              <p className="count">{stats.completed}</p>
              <div className="progress-bar">
                <div className="progress" style={{width: `${stats.completed > 0 ? 100 : 0}%`, backgroundColor: '#6c757d'}}></div>
              </div>
            </div>
          </div>

          <div className="charts-section">
            <div className="chart-container">
              <h3>📊 Phân bố trạng thái đơn hàng</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>📈 Thống kê chi tiết</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
