import { useEffect, useState } from 'react'
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

  // 🔥 lưu action đã chọn cho từng order
  const [selectedActions, setSelectedActions] = useState<{ [key: number]: string }>({})

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      const response = await apiClient.get('/api/orders/accounting-orders')
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

  // 🔥 xử lý action
  const handleAction = async (order: Order, action: string) => {
    if (!action) return

    try {
      if (action === 'approve_send') {
        
        try {
          await apiClient.post(`/api/orders/${order.id}/approve`, {
            approvalReason: 'Phê duyệt bởi kế toán'
          })

          // delay nhẹ để tránh race condition
          await new Promise(res => setTimeout(res, 300))

          await apiClient.post(`/api/orders/${order.id}/status`, {
            status: 'Sent'
          })

          fetchOrders()
          alert('Đã phê duyệt và gửi trạm')
        } catch (err: any) {
          console.error(err.response?.data || err)
          alert(err.response?.data?.error || 'Thao tác thất bại')
        }
      
        alert('Đã phê duyệt và gửi trạm')
      }

      if (action === 'send') {
        if (order.orderStatus !== 'Approved') {
          alert('Đơn phải được phê duyệt trước khi gửi trạm!')
          return
        }

        await apiClient.post(`/api/orders/${order.id}/status`, {
          status: 'Sent'
        })

        alert('Đã gửi trạm')
      }

      if (action === 'reject') {
        const reason = prompt('Nhập lý do từ chối:')
        if (!reason) return

        await apiClient.post(`/api/orders/${order.id}/reject`, {
          rejectionReason: reason
        })

        alert('Đã từ chối đơn')
      }

      // reset action đã chọn
      setSelectedActions(prev => ({
        ...prev,
        [order.id]: ''
      }))

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
                  <td>
                    <span className={`status ${order.orderStatus.replace(/\s+/g, '-')}`}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>

                  {/* ✅ ACTION MỚI */}
                  <td>
  {order.orderStatus === 'Pending Approval' ? (

    <div className="action-group">
      <select
        className="action-select"
        value={selectedActions[order.id] || ''}
        onChange={(e) =>
          setSelectedActions({
            ...selectedActions,
            [order.id]: e.target.value
          })
        }
      >
        <option value="">-- Chọn --</option>
        <option value="approve_send">
          Phê duyệt & Gửi trạm
        </option>

        <option value="reject">
          Từ chối
        </option>
      </select>

      <button
        className="action-confirm"
        onClick={() =>
          handleAction(order, selectedActions[order.id])
        }
        disabled={!selectedActions[order.id]}
      >
        Xác nhận
      </button>
    </div>

  ) : (

    <div className="current-status">
      {order.orderStatus}
    </div>

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