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
  coordinatorName?: string
  customerName: string
  debtAmount: number
  debtLimit: number
  }

const statusMap: Record<string, string> = {
  'Draft': 'Đơn tạm',
  'Pending Approval': 'Chờ duyệt',
  'Approved': 'Đã duyệt',
  'Processing': 'Đang xử lý',
  'Delivering': 'Đang giao hàng',
  'Completed': 'Hoàn thành',
  'Cancelled': 'Đã hủy',
  'Rejected': 'Từ chối',
  'Sent': 'Đã gửi',
  'Delivered': 'Đã giao'
}

const getStatusLabel = (status: string) => statusMap[status] || status

// FIX CHUẨN
const getStatusClass = (status: string) =>
  status.replace(/\s+/g, '')

export default function AccountingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedActions, setSelectedActions] = useState<{ [key: number]: string }>({})

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      const response = await apiClient.get('/api/orders/accounting-orders')
      const list = Array.isArray(response.data) ? response.data : []

      setOrders(
        list.map((o: any) => ({
          id: o.Id,
          orderCode: o.OrderCode,
          destinationStation: o.DestinationStation || '',
          totalAmount: o.TotalAmount || 0,
          orderStatus: o.OrderStatus,
          createdAt: o.CreatedAt,
          customerName: o.CustomerName || '',

          debtAmount: o.DebtAmount || 0,
          debtLimit: o.DebtLimit || 0,
          coordinatorName: o.CoordinatorName || ''

        }))
      )
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đơn hàng:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (order: Order, action: string) => {
    if (!action) return

    try {
      if (action === 'approve') {
        try {
          await apiClient.post(`/api/orders/${order.id}/status`, {
            status: 'Approved'
          })

          fetchOrders()
          alert('Đã phê duyệt đơn hàng')

        } catch (err: any) {
          console.error(err.response?.data || err)
          alert(err.response?.data?.error || 'Thao tác thất bại')
        }
      }

      if (action === 'reject') {
        try {
          const reason = prompt('Nhập lý do từ chối:')
          if (!reason) return

          // FIX QUAN TRỌNG:
          // đổi sang Rejected
          await apiClient.post(`/api/orders/${order.id}/status`, {
            status: 'Rejected',
            reason
          })

          fetchOrders()
          alert('Đã từ chối đơn hàng')

        } catch (err: any) {
          console.error(err.response?.data || err)
          alert(err.response?.data?.error || 'Thao tác thất bại')
        }
      }

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
    <div className="orders-dashboard">
      <div className="page-header">
        <div>
          <h1>Đơn hàng - Kế toán</h1>
          <p>Danh sách đơn hàng, phê duyệt và gửi trạm</p>
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
                <th>Công nợ</th>
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

                  <td>{order.customerName}</td>

                  <td>{order.destinationStation}</td>

                  <td>
                    <div>

                      <strong>
                        {order.debtAmount.toLocaleString()} đ
                      </strong>

                      <div
                        style={{
                          fontSize: 12,
                          color:
                            order.debtAmount >
                            order.debtLimit
                              ? 'red'
                              : '#666'
                        }}
                      >
                        Hạn mức:
                        {order.debtLimit.toLocaleString()} đ
                      </div>

                      {
                        order.debtAmount +
                        order.totalAmount >
                        order.debtLimit && (

                          <div
                            style={{
                              color: 'red',
                              fontSize: 12,
                              marginTop: 4,
                              fontWeight: 600
                            }}
                          >
                            ⚠️ Vượt hạn mức
                          </div>
                        )
                      }

                    </div>
                  </td>

                  <td className="money">
                    {order.totalAmount.toLocaleString()} đ
                  </td>

                  <td>
                    <span
                      className={`status ${getStatusClass(order.orderStatus)}`}
                    >
                      {getStatusLabel(order.orderStatus)}
                    </span>
                  </td>

                  <td>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>

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

                          <option value="approve">
                            Phê duyệt
                          </option>

                          <option value="reject">
                            Từ chối
                          </option>
                        </select>

                        <button
                          className="action-confirm"
                          onClick={() =>
                            handleAction(
                              order,
                              selectedActions[order.id]
                            )
                          }
                          disabled={!selectedActions[order.id]}
                        >
                          Xác nhận
                        </button>
                      </div>
                    ) : null}
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