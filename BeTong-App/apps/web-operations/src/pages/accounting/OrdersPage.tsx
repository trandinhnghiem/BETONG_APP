import { useEffect, useState } from 'react'
import { FiCheckCircle, FiXCircle, FiEye, FiFilter, FiSearch } from 'react-icons/fi'
import apiClient from '../../services/api'
import './OrdersPage.css'

interface Order {
  id: number
  orderCode: string
  coordinatorName: string
  sourceStation: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  createdAt: string
  paymentStatus: string
}

export default function AccountingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/orders/pending-approval')

      setOrders(response.data.map((order: any) => ({
        id: order.Id,
        orderCode: order.OrderCode,
        coordinatorName: order.CoordinatorName,
        sourceStation: order.SourceStation,
        destinationStation: order.DestinationStation,
        totalAmount: order.TotalAmount,
        orderStatus: order.OrderStatus,
        createdAt: order.CreatedAt,
        paymentStatus: order.PaymentStatus || 'Chờ thanh toán'
      })))
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đơn hàng:', error)

      // dữ liệu mẫu
      setOrders([
        {
          id: 1,
          orderCode: 'ORD-001',
          coordinatorName: 'John Coordinator',
          sourceStation: 'Trạm A',
          destinationStation: 'Trạm B',
          totalAmount: 1500000,
          orderStatus: 'Chờ duyệt',
          createdAt: '2024-01-15',
          paymentStatus: 'Chờ thanh toán'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (orderId: number) => {
    if (!confirm('Bạn có chắc muốn duyệt đơn này không?')) return

    try {
      await apiClient.post(`/api/orders/${orderId}/approve`, {
        approvalReason: 'Đã duyệt bởi kế toán'
      })

      setOrders(orders.map(order =>
        order.id === orderId
          ? { ...order, orderStatus: 'Đã duyệt' }
          : order
      ))

      alert('Duyệt đơn thành công!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Duyệt đơn thất bại')
    }
  }

  const handleReject = async (orderId: number) => {
    const reason = prompt('Nhập lý do từ chối:')
    if (!reason) return

    try {
      await apiClient.post(`/api/orders/${orderId}/reject`, {
        rejectionReason: reason
      })

      setOrders(orders.map(order =>
        order.id === orderId
          ? { ...order, orderStatus: 'Đã từ chối' }
          : order
      ))

      alert('Đã từ chối đơn!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Từ chối thất bại')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Chờ duyệt': return 'orange'
      case 'Đã duyệt': return 'green'
      case 'Đã từ chối': return 'red'
      case 'Hoàn thành': return 'blue'
      default: return 'gray'
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesFilter =
      filter === 'all' ||
      order.orderStatus.toLowerCase().includes(filter)

    const matchesSearch =
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.coordinatorName.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>Quản lý đơn hàng</h1>
        <p>Xem và duyệt đơn từ điều phối viên</p>
      </div>

      {/* SEARCH + FILTER */}
      <div className="filters-section">
        <div className="search-box">
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button onClick={() => setFilter('all')}>Tất cả</button>
          <button onClick={() => setFilter('pending')}>Chờ duyệt</button>
          <button onClick={() => setFilter('approved')}>Đã duyệt</button>
          <button onClick={() => setFilter('rejected')}>Đã từ chối</button>
        </div>
      </div>

      {/* LIST */}
      <div className="orders-section">
        {loading ? (
          <div className="loading">Đang tải dữ liệu...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <FiFilter size={48} />
            <p>Không tìm thấy đơn hàng</p>
          </div>
        ) : (
          <div className="orders-table">
            <div className="table-header">
              <div>Mã đơn</div>
              <div>Điều phối</div>
              <div>Tuyến</div>
              <div>Số tiền</div>
              <div>Trạng thái</div>
              <div>Thao tác</div>
            </div>

            {filteredOrders.map(order => (
              <div key={order.id} className="table-row">
                <div>{order.orderCode}</div>
                <div>{order.coordinatorName}</div>
                <div>{order.sourceStation} → {order.destinationStation}</div>
                <div>{order.totalAmount.toLocaleString()} VND</div>

                <div>
                  <span className={`status-badge ${getStatusColor(order.orderStatus)}`}>
                    {order.orderStatus}
                  </span>
                </div>

                <div className="actions">
                  <button onClick={() => setSelectedOrder(order)}>
                    <FiEye size={14} /> Xem
                  </button>

                  {order.orderStatus === 'Chờ duyệt' && (
                    <>
                      <button onClick={() => handleApprove(order.id)}>
                        <FiCheckCircle size={14} /> Duyệt
                      </button>

                      <button onClick={() => handleReject(order.id)}>
                        <FiXCircle size={14} /> Từ chối
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Chi tiết đơn: {selectedOrder.orderCode}</h2>

            <p>Điều phối: {selectedOrder.coordinatorName}</p>
            <p>Tuyến: {selectedOrder.sourceStation} → {selectedOrder.destinationStation}</p>
            <p>Số tiền: {selectedOrder.totalAmount.toLocaleString()} VND</p>
            <p>Thanh toán: {selectedOrder.paymentStatus}</p>
            <p>Ngày tạo: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>

            <button onClick={() => setSelectedOrder(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}