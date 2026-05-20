import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import './OrdersPage.css'

interface Order {
  id: number
  orderCode: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  createdAt: string
}

export default function CoordinatorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, search, status, fromDate, toDate])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      const res = await apiClient.get('/api/orders/my-orders')

      const data = res.data.map((o: any) => ({
        id: o.Id,
        orderCode: o.OrderCode,
        destinationStation: o.DestinationStation,
        totalAmount: o.TotalAmount || 0,
        orderStatus: o.OrderStatus,
        createdAt: o.CreatedAt
      }))

      setOrders(data)

    } catch (err) {
      console.error(err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...orders]

    if (search) {
      result = result.filter(o =>
        o.orderCode.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (status !== 'All') {
      result = result.filter(o => o.orderStatus === status)
    }

    if (fromDate) {
      result = result.filter(o =>
        new Date(o.createdAt) >= new Date(fromDate)
      )
    }

    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)

      result = result.filter(o =>
        new Date(o.createdAt) <= end
      )
    }

    setFilteredOrders(result)
  }

  const reset = () => {
    setSearch('')
    setStatus('All')
    setFromDate('')
    setToDate('')
  }

  const sendOrderToStation = async (id: number) => {
    try {
      await apiClient.post(`/api/orders/${id}/status`, {
        status: 'Pending Approval'
      })

      fetchOrders()
      alert('Đã gửi kế toán')
    } catch (err) {
      console.error(err)
      alert('Gửi thất bại')
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Draft':
        return { backgroundColor: '#ecf0f1', color: '#7f8c8d' }
      case 'Pending Approval':
        return { backgroundColor: '#fff7e6', color: '#d68910' }
      case 'Approved':
        return { backgroundColor: '#e6f7ff', color: '#1d6fff' }
      case 'Processing':
        return { backgroundColor: '#fff4e6', color: '#c97c0e' }
      case 'Delivering':
        return { backgroundColor: '#e6fbff', color: '#0f7c8f' }
      case 'Completed':
        return { backgroundColor: '#e6ffed', color: '#239a38' }
      case 'Cancelled':
        return { backgroundColor: '#ffe6e6', color: '#c0392b' }
      default:
        return { backgroundColor: '#f0f0f0', color: '#333' }
    }
  }

  return (
    <div className="orders-dashboard">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Đơn hàng của tôi</h1>
          <p>Quản lý và theo dõi trạng thái đơn hàng</p>
        </div>
      </div>


      {/* FILTER BAR */}
      <div className="filter-bar">

        <input
          placeholder="🔍 Tìm mã đơn..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">Tất cả trạng thái</option>
          <option value="Draft">Nháp</option>
          <option value="Pending Approval">Chờ duyệt</option>
          <option value="Approved">Đã duyệt</option>
          <option value="Processing">Đang xử lý</option>
          <option value="Delivering">Đang giao</option>
          <option value="Completed">Hoàn thành</option>
          <option value="Cancelled">Hủy</option>
        </select>

        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <button className="reset-btn" onClick={reset}>
          Reset
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : (
        <div className="table-card">

          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Trạm</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id}>
                  <td className="code">{o.orderCode}</td>
                  <td>{o.destinationStation}</td>
                  <td className="money">
                    {o.totalAmount.toLocaleString()} đ
                  </td>

                  <td>
                    <span className="status" style={getStatusStyle(o.orderStatus)}>
                      {o.orderStatus}
                    </span>
                  </td>

                  <td>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>

                  <td>
                    {o.orderStatus === 'Draft' && (
                      <button
                        className="action-btn"
                        onClick={() => sendOrderToStation(o.id)}
                      >
                        Gửi kế toán
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
    </div>
  )
}