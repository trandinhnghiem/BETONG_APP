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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      const response = await apiClient.get('/api/orders/my-orders')

      setOrders(response.data.map((order: any) => ({
        id: order.Id,
        orderCode: order.OrderCode,
        destinationStation: order.DestinationStation,
        totalAmount: order.TotalAmount || 0,
        orderStatus: order.OrderStatus,
        createdAt: order.CreatedAt
      })))

    } catch (error) {
      console.error('Lỗi khi lấy đơn hàng:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const sendOrderToStation = async (orderId: number) => {
    try {
      // Send to accounting for approval instead of directly to station
      await apiClient.post(`/api/orders/${orderId}/status`, { status: 'Pending Approval' })
      fetchOrders()
      alert('Đã gửi đơn tới bộ phận kế toán (chờ phê duyệt)')
    } catch (error) {
      console.error(error)
      alert('Gửi đơn thất bại')
    }
  }

  return (
    <div className="orders-container">

      <div className="orders-header">
        <h1>📦 Đơn hàng của tôi</h1>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : orders.length === 0 ? (
        <div className="empty">Không có đơn hàng nào</div>
      ) : (
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Trạm nhận</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="code">{order.orderCode}</td>

                  <td>{order.destinationStation}</td>

                  <td className="money">
                    {order.totalAmount.toLocaleString()} đ
                  </td>

                  <td>
                    <span className={`status ${order.orderStatus.replace(' ', '-')}`}>
                      {order.orderStatus}
                    </span>
                  </td>

                  <td>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>

                  <td>
                    {(order.orderStatus === 'Approved' || order.orderStatus === 'Pending Approval') && (
                      <button
                        className="btn-send"
                        onClick={() => sendOrderToStation(order.id)}
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