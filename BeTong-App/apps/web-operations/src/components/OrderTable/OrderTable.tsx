import { useState } from 'react'
import './OrderTable.css'

interface Order {
  id: number
  orderCode: string
  status: string
  createdAt: string
  totalAmount: number
  coordinatorName?: string
  approvalStatus?: string
}

interface OrderTableProps {
  orders: Order[]
  loading?: boolean
  onActionClick?: (order: Order, action: string) => void
  showActions?: boolean
  actionButtons?: { label: string; action: string; className: string }[]
}

export default function OrderTable({
  orders,
  loading = false,
  onActionClick,
  showActions = true,
  actionButtons = []
}: OrderTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)

  if (loading) {
    return <div className="order-table-loading">Đang tải dữ liệu...</div>
  }

  if (orders.length === 0) {
    return (
      <div className="order-table-empty">
        <p>Không có đơn hàng nào</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'Draft': 'status-draft',
      'Pending Approval': 'status-pending',
      'Approved': 'status-approved',
      'Rejected': 'status-rejected',
      'Completed': 'status-completed',
      'Cancelled': 'status-cancelled'
    }
    return statusMap[status] || 'status-default'
  }

  return (
    <div className="order-table-container">
      <table className="order-table">
        <thead>
          <tr>
            <th>Mã đơn hàng</th>
            <th>Ngày tạo</th>
            <th>Trạng thái</th>
            <th>Số tiền</th>
            {orders[0]?.coordinatorName && <th>Người tạo</th>}
            {orders[0]?.approvalStatus && <th>Phê duyệt</th>}
            {showActions && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className={selectedOrder === order.id ? 'selected' : ''}
              onClick={() => setSelectedOrder(order.id)}
            >
              <td className="order-code">{order.orderCode}</td>
              <td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
              <td>
                <span className={`status-badge ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </td>
              <td className="amount">
                {order.totalAmount.toLocaleString('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                })}
              </td>
              {order.coordinatorName && <td>{order.coordinatorName}</td>}
              {order.approvalStatus && (
                <td>
                  <span className={`approval-badge approval-${order.approvalStatus?.toLowerCase()}`}>
                    {order.approvalStatus}
                  </span>
                </td>
              )}
              {showActions && (
                <td className="actions-cell">
                  <div className="action-buttons">
                    {actionButtons.map((btn) => (
                      <button
                        key={btn.action}
                        className={`action-btn ${btn.className}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onActionClick?.(order, btn.action)
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
