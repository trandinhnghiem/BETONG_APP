import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiRefreshCcw } from 'react-icons/fi'
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
      alert('Lỗi')
    }
  }

  return (
    <div className="orders-page">

      <h1>📦 Đơn hàng {stationName}</h1>

      {loading ? (
        <div className="loading">Đang tải đơn hàng...</div>
      ) : orders.length === 0 ? (
        <div className="no-orders">Không có đơn hàng nào cho trạm của bạn</div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">

              <h3>{order.orderCode}</h3>
              <p>Điều phối: {order.coordinatorName}</p>
              <p>Trạm nhận: {order.destinationStation}</p>
              <p>Tiền: {order.totalAmount.toLocaleString()} đ</p>
              <p>Trạng thái: {order.orderStatus}</p>

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