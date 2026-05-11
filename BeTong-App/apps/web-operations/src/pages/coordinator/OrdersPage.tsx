import { useEffect, useState } from 'react'
import apiClient from '../../services/api'

interface Order {
  id: number
  orderCode: string
  sourceStation: string
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
        sourceStation: order.SourceStation,
        destinationStation: order.DestinationStation,
        totalAmount: order.TotalAmount,
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
      await apiClient.post(`/api/orders/${orderId}/status`, { status: 'Sent' })
      fetchOrders()
      alert('Đã gửi đơn tới trạm thành công')
    } catch (error) {
      console.error('Lỗi khi gửi đơn tới trạm:', error)
      alert('Gửi đơn tới trạm thất bại')
    }
  }

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/api/orders/export', {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'orders-report.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Lỗi khi tải báo cáo:', error)
      alert('Không thể tải báo cáo vào lúc này.')
    }
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>Đơn hàng của tôi</h1>
        <button onClick={handleExport}>Tải báo cáo</button>
      </div>
      {loading ? (
        <div>Đang tải...</div>
      ) : orders.length === 0 ? (
        <div>Không có đơn hàng nào.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Trạm gửi</th>
              <th>Trạm nhận</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.orderCode}</td>
                <td>{order.sourceStation}</td>
                <td>{order.destinationStation}</td>
                <td>{order.totalAmount.toLocaleString()} VND</td>
                <td>{order.orderStatus}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  {order.orderStatus === 'Approved' && (
                    <button onClick={() => sendOrderToStation(order.id)}>
                      Gửi trạm
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
