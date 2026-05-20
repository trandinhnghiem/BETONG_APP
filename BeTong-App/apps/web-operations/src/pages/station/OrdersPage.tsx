import { useEffect, useState } from 'react'
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

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/api/orders/station-orders')

      setOrders(res.data.map((o: any) => ({
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

  const updateStatus = async (
  orderId: number,
  status: string
) => {

  try {

    // chống bấm nhiều lần
    const confirmed = window.confirm(
      `Xác nhận chuyển sang trạng thái "${status}" ?`
    )

    if (!confirmed) return

    await apiClient.post(
      `/api/orders/${orderId}/status`,
      { status }
    )

    // reload lại data mới
    await fetchOrders()

  } catch (err) {

    console.error(err)

    alert('Lỗi cập nhật')
  }
}

  const getStatusClass = (status: string) => {
    return status.replace(/\s/g, '')
  }

  return (
    <div className="orders-dashboard">

      {/* HEADER */}
<div className="page-header">
  <div>
    <h1>Quản lý đơn hàng</h1>
    <p>Theo dõi và cập nhật trạng thái đơn hàng của trạm</p>
  </div>

  <button className="refresh-btn" onClick={fetchOrders}>
    <FiRefreshCcw size={16} />
    Làm mới
  </button>
</div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
     
              <th>Tiền</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.orderCode}</td>

                <td>{order.totalAmount.toLocaleString()} đ</td>

                <td>
                  <span className={`status ${getStatusClass(order.orderStatus)}`}>
                    {order.orderStatus}
                  </span>
                </td>

                <td>
                  <div className="actions">

                    {String(order.orderStatus).trim() === 'Approved' && (
                      <button onClick={() => updateStatus(order.id, 'Processing')}>
                        ⚙️ Xử lý
                      </button>
                    )}

                    {order.orderStatus === 'Processing' && (
                      <button onClick={() => updateStatus(order.id, 'Delivering')}>
                        🚚 Giao hàng
                      </button>
                    )}

                    {order.orderStatus === 'Delivering' && (
                      <button onClick={() => updateStatus(order.id, 'Completed')}>
                        ✅ Hoàn thành
                      </button>
                    )}

                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      )}

    </div>
  )
}