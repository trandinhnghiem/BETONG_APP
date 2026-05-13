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
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [params] = useSearchParams()
  const paramStationName = params.get('station')
  const [stationName, setStationName] = useState<string | null>(paramStationName)

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role === 'Station') {
      const fn = localStorage.getItem('fullName')
      setStationName(fn || 'Trạm của bạn')
    } else {
      setStationName(paramStationName)
    }

    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramStationName])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      const role = localStorage.getItem('userRole')
      let res

      if (role === 'Station') {
        // station users: backend should return only orders for their station
        res = await apiClient.get('/api/orders/station-orders')
      } else if (paramStationName) {
        // admins/others viewing a station via query param: fetch all and filter client-side
        res = await apiClient.get('/api/orders')
      } else {
        // fallback: fetch station-orders endpoint
        res = await apiClient.get('/api/orders/station-orders')
      }

      let data = res.data || []

      if (role !== 'Station' && paramStationName) {
        data = data.filter((o: any) => (o.DestinationStation || o.destinationStation || '').toString() === paramStationName)
      }

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

  const openOrder = async (orderId: number) => {
    try {
      const res = await apiClient.get(`/api/orders/${orderId}`)
      setSelectedOrder(res.data)
      setDetailOpen(true)
    } catch (err) {
      console.error('Lỗi lấy chi tiết đơn:', err)
      alert('Không thể tải chi tiết đơn')
    }
  }

  const closeDetail = () => {
    setSelectedOrder(null)
    setDetailOpen(false)
  }

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await apiClient.post(`/api/orders/${orderId}/status`, { status })
      fetchOrders()
      if (detailOpen) {
        // refresh detail view if open
        openOrder(orderId)
      }
      alert('Cập nhật thành công')
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
                <button onClick={() => openOrder(order.id)} className="confirm-btn">
                  Chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailOpen && selectedOrder && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết đơn {selectedOrder.OrderCode}</h3>
              <button className="close-btn" onClick={closeDetail}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Trạng thái:</strong> {selectedOrder.OrderStatus}</p>
              <p><strong>Ghi chú:</strong></p>
              <pre style={{whiteSpace: 'pre-wrap'}}>{selectedOrder.Notes}</pre>

              <h4>Mặt hàng</h4>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <table className="detail-table">
                  <thead>
                    <tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th></tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((it: any) => (
                      <tr key={it.Id}>
                        <td>{it.ProductName || it.Product}</td>
                        <td>{it.Quantity}</td>
                        <td>{Number(it.UnitPrice || it.Price || 0).toLocaleString()} đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div>Không có sản phẩm</div>
              )}
            </div>
            <div className="modal-footer">
              {selectedOrder.OrderStatus === 'Pending Approval' && (
                <button onClick={() => updateStatus(selectedOrder.Id, 'Approved')} className="confirm-btn">Xác nhận trộn</button>
              )}
              {selectedOrder.OrderStatus === 'Approved' && (
                <button onClick={() => updateStatus(selectedOrder.Id, 'Sent')} className="start-btn">Bắt đầu giao</button>
              )}
              {selectedOrder.OrderStatus === 'Sent' && (
                <button onClick={() => updateStatus(selectedOrder.Id, 'Delivered')} className="deliver-btn">Đã giao</button>
              )}
              {selectedOrder.OrderStatus === 'Delivered' && (
                <button onClick={() => updateStatus(selectedOrder.Id, 'Completed')} className="complete-btn">Hoàn thành</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}