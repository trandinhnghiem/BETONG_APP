import { useEffect, useState } from 'react'
import { FiEye, FiFilter } from 'react-icons/fi'
import { FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import './OrdersPage.css'

interface Order {
  id: number
  orderCode: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  createdAt: string
  coordinatorName?: string
}

export default function AccountingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      // accounting cares about orders pending approval
      const response = await apiClient.get('/api/orders/pending-approval')
      const list = Array.isArray(response.data) ? response.data : []

      setOrders(list.map((o: any) => ({
        id: o.Id,
        orderCode: o.OrderCode,
        destinationStation: o.DestinationStation,
        totalAmount: o.TotalAmount || 0,
        orderStatus: o.OrderStatus,
        createdAt: o.CreatedAt,
        coordinatorName: o.CoordinatorName || o.Coordinator || ''
      })))
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đơn hàng:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (orderId: number) => {
    if (!confirm('Bạn có chắc muốn phê duyệt và gửi trạm không?')) return

    try {
      await apiClient.post(`/api/orders/${orderId}/approve`, { approvalReason: 'Phê duyệt bởi kế toán' })
      // after approve, send to station
      await apiClient.post(`/api/orders/${orderId}/status`, { status: 'Sent' })
      fetchOrders()
      alert('Đã phê duyệt và gửi trạm')
    } catch (err) {
      console.error(err)
      alert('Thao tác thất bại')
    }
  }

  const handleReject = async (orderId: number) => {
    const reason = prompt('Nhập lý do từ chối:')
    if (!reason) return

    try {
      await apiClient.post(`/api/orders/${orderId}/reject`, { rejectionReason: reason })
      fetchOrders()
      alert('Đã từ chối đơn')
    } catch (err) {
      console.error(err)
      alert('Từ chối thất bại')
    }
  }

  const handleSendToStation = async (order: Order) => {
    try {
      if (order.orderStatus !== 'Approved') {
        // If not approved, cancel the order as per requirement
        await apiClient.post(`/api/orders/${order.id}/reject`, { rejectionReason: 'Bị huỷ do chưa phê duyệt khi gửi trạm' })
        alert('Đơn chưa được phê duyệt, đã huỷ')
      } else {
        await apiClient.post(`/api/orders/${order.id}/status`, { status: 'Sent' })
        alert('Đã gửi trạm')
      }

      fetchOrders()
    } catch (err) {
      console.error(err)
      alert('Thao tác thất bại')
    }
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>📋 Đơn hàng - Kế toán</h1>
        <div>
          <Link to="/accounting" className="action-btn secondary">Dashboard</Link>
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : orders.length === 0 ? (
        <div className="empty">Không có đơn hàng</div>
      ) : (
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Điều phối</th>
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
                  <td>{order.coordinatorName}</td>
                  <td>{order.destinationStation}</td>
                  <td className="money">{order.totalAmount.toLocaleString()} đ</td>
                  <td><span className={`status ${order.orderStatus.replace(/\s+/g, '-')} `}>{order.orderStatus}</span></td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-approve" onClick={() => handleApprove(order.id)}>Phê duyệt & Gửi trạm</button>
                    <button className="btn-reject" onClick={() => handleReject(order.id)}>Từ chối</button>
                    <button className="btn-send" onClick={() => handleSendToStation(order)}>Gửi trạm</button>
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