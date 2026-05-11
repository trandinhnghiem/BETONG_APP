import { useEffect, useState } from 'react'
import { FiCheckCircle, FiRefreshCcw } from 'react-icons/fi'
import apiClient from '../../services/api'

interface Order {
  id: number
  orderCode: string
  coordinatorName: string
  sourceStation: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  createdAt: string
}

export default function StationOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/orders/station-orders')
      setOrders(response.data.map((order: any) => ({
        id: order.Id,
        orderCode: order.OrderCode,
        coordinatorName: order.CoordinatorName,
        sourceStation: order.SourceStation,
        destinationStation: order.DestinationStation,
        totalAmount: order.TotalAmount,
        orderStatus: order.OrderStatus,
        createdAt: order.CreatedAt
      })))
    } catch (error) {
      console.error('Lỗi khi lấy đơn hàng trạm:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await apiClient.post(`/api/orders/${orderId}/status`, { status })
      fetchOrders()
      alert('Cập nhật trạng thái thành công')
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error)
      alert('Cập nhật trạng thái thất bại')
    }
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>Đơn hàng trạm</h1>
        <p>Quản lý đơn hàng được gửi tới trạm.</p>
      </div>

      {loading ? (
        <div>Đang tải...</div>
      ) : orders.length === 0 ? (
        <div>Không có đơn hàng nào được gửi tới trạm.</div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <h3>{order.orderCode}</h3>
              <p>Điều phối: {order.coordinatorName}</p>
              <p>{order.sourceStation} → {order.destinationStation}</p>
              <p>Số tiền: {order.totalAmount.toLocaleString()} VND</p>
              <p>Trạng thái: {order.orderStatus}</p>
              <div className="actions">
                {order.orderStatus === 'Sent' && (
                  <button onClick={() => updateStatus(order.id, 'Delivered')}>
                    <FiCheckCircle size={16} /> Xác nhận nhận
                  </button>
                )}
                {order.orderStatus === 'Delivered' && (
                  <button onClick={() => updateStatus(order.id, 'Completed')}>
                    <FiRefreshCcw size={16} /> Đánh dấu hoàn thành
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
