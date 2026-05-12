import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiRefreshCcw } from 'react-icons/fi'
import apiClient from '../../services/api'

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

  const [params] = useSearchParams()
  const stationName = params.get('station')

  useEffect(() => {
    fetchOrders()
  }, [stationName])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      const res = await apiClient.get('/api/orders/station-orders')

      let data = res.data || []

      // ✅ lọc theo trạm
      if (stationName) {
        data = data.filter((o: any) =>
          o.DestinationStation === stationName
        )
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

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await apiClient.post(`/api/orders/${orderId}/status`, { status })
      fetchOrders()
      alert('Cập nhật thành công')
    } catch (err) {
      alert('Lỗi')
    }
  }

  return (
    <div className="orders-page">

      <h1>📦 Đơn hàng {stationName}</h1>

      {loading ? (
        <div>Đang tải...</div>
      ) : orders.length === 0 ? (
        <div>Không có đơn</div>
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
                {order.orderStatus === 'Sent' && (
                  <button onClick={() => updateStatus(order.id, 'Delivered')}>
                    <FiCheckCircle /> Xác nhận nhận
                  </button>
                )}

                {order.orderStatus === 'Delivered' && (
                  <button onClick={() => updateStatus(order.id, 'Completed')}>
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