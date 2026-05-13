import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiRefreshCcw, FiSearch, FiFilter } from 'react-icons/fi'
import apiClient from '../../services/api'
import './OrdersPage.css'

interface Order {
  id: number
  orderCode: string
  coordinatorName: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  createdAt: string
}

export default function StationOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [params] = useSearchParams()
  const stationName = params.get('station')

  useEffect(() => {
    fetchOrders()
  }, [stationName])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      const res = await apiClient.get('/api/orders/station-orders')
      const data = res.data || []

      setOrders(data.map((o: any) => ({
        id: o.Id,
        orderCode: o.OrderCode,
        coordinatorName: o.CoordinatorName,
        destinationStation: o.DestinationStation,
        totalAmount: o.TotalAmount || 0,
        orderStatus: o.OrderStatus,
        createdAt: o.CreatedAt
      })))

    } catch (err) {
      console.error(err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = orders

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.coordinatorName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter) {
      filtered = filtered.filter(order => order.orderStatus === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await apiClient.post(`/api/orders/${orderId}/status`, { status })
      fetchOrders()
      alert('Cập nhật thành công!')
    } catch (err) {
      alert('Lỗi cập nhật trạng thái')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Approval': return '#ffc107'
      case 'Approved': return '#28a745'
      case 'Sent': return '#007bff'
      case 'Delivered': return '#17a2b8'
      case 'Completed': return '#6c757d'
      default: return '#6c757d'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pending Approval': return 'Chờ xác nhận'
      case 'Approved': return 'Đã xác nhận'
      case 'Sent': return 'Đang giao'
      case 'Delivered': return 'Đã giao'
      case 'Completed': return 'Hoàn thành'
      default: return status
    }
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>📦 Đơn hàng {stationName || 'Trạm của bạn'}</h1>
        <p>Quản lý và cập nhật trạng thái đơn hàng</p>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn hoặc tên điều phối..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <FiFilter className="filter-icon" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="Pending Approval">Chờ xác nhận</option>
            <option value="Approved">Đã xác nhận</option>
            <option value="Sent">Đang giao</option>
            <option value="Delivered">Đã giao</option>
            <option value="Completed">Hoàn thành</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải đơn hàng...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="no-orders">
          {orders.length === 0 ? 'Không có đơn hàng nào' : 'Không tìm thấy đơn hàng phù hợp'}
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <h3>{order.orderCode}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.orderStatus) }}
                >
                  {getStatusText(order.orderStatus)}
                </span>
              </div>

              <div className="order-details">
                <p><strong>Điều phối:</strong> {order.coordinatorName}</p>
                <p><strong>Trạm nhận:</strong> {order.destinationStation}</p>
                <p><strong>Tổng tiền:</strong> {order.totalAmount.toLocaleString()} VND</p>
                <p><strong>Ngày tạo:</strong> {new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>

              <div className="actions">
                {order.orderStatus === 'Pending Approval' && (
                  <button onClick={() => updateStatus(order.id, 'Approved')} className="confirm-btn">
                    <FiCheckCircle /> Xác nhận trộn
                  </button>
                )}

                {order.orderStatus === 'Approved' && (
                  <button onClick={() => updateStatus(order.id, 'Sent')} className="start-btn">
                    <FiRefreshCcw /> Bắt đầu giao
                  </button>
                )}

                {order.orderStatus === 'Sent' && (
                  <button onClick={() => updateStatus(order.id, 'Delivered')} className="deliver-btn">
                    <FiCheckCircle /> Đã giao
                  </button>
                )}

                {order.orderStatus === 'Delivered' && (
                  <button onClick={() => updateStatus(order.id, 'Completed')} className="complete-btn">
                    <FiRefreshCcw /> Hoàn thành
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}