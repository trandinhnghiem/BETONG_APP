import { useEffect, useState } from 'react'
import { FiClock, FiCheckCircle, FiXCircle, FiDollarSign } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import './Dashboard.css'

interface Order {
  id: number
  orderCode: string
  coordinatorName: string
  totalAmount: number
  orderStatus: string
  createdAt: string
}

export default function AccountingDashboard() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    approvedToday: 0,
    totalValue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Mock data (sau này thay bằng API thật)
      setPendingOrders([
        {
          id: 1,
          orderCode: 'ORD-001',
          coordinatorName: 'Nhân viên điều phối 1',
          totalAmount: 1500000,
          orderStatus: 'Chờ duyệt',
          createdAt: '2024-01-15'
        },
        {
          id: 2,
          orderCode: 'ORD-002',
          coordinatorName: 'Nhân viên điều phối 2',
          totalAmount: 2200000,
          orderStatus: 'Chờ duyệt',
          createdAt: '2024-01-15'
        }
      ])

      setStats({
        pendingApprovals: 2,
        approvedToday: 3,
        totalValue: 4500000
      })
    } catch (error) {
      console.error('Lỗi khi tải dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (orderId: number) => {
    console.log('Duyệt đơn:', orderId)
  }

  const handleReject = async (orderId: number) => {
    console.log('Từ chối đơn:', orderId)
  }

  return (
    <div className="accounting-dashboard">
      <div className="dashboard-header">
        <h1>Bảng điều khiển kế toán</h1>
        <p>Quản lý duyệt đơn hàng và hoạt động tài chính</p>
      </div>

      {loading ? (
        <div className="loading">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card orange">
              <div className="stat-icon">
                <FiClock size={24} />
              </div>
              <div className="stat-content">
                <h3>Đơn chờ duyệt</h3>
                <p className="stat-value">{stats.pendingApprovals}</p>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <FiCheckCircle size={24} />
              </div>
              <div className="stat-content">
                <h3>Đã duyệt hôm nay</h3>
                <p className="stat-value">{stats.approvedToday}</p>
              </div>
            </div>

            <div className="stat-card blue">
              <div className="stat-icon">
                <FiDollarSign size={24} />
              </div>
              <div className="stat-content">
                <h3>Tổng giá trị</h3>
                <p className="stat-value">{stats.totalValue.toLocaleString()} VND</p>
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            {/* DANH SÁCH ĐƠN CHỜ DUYỆT */}
            <div className="section">
              <div className="section-header">
                <h2>Đơn hàng chờ duyệt</h2>
                <Link to="/accounting/orders" className="view-all-link">
                  Xem tất cả
                </Link>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="empty-state">
                  <FiClock size={48} />
                  <p>Không có đơn nào cần duyệt</p>
                </div>
              ) : (
                <div className="orders-list">
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="order-item">
                      <div className="order-info">
                        <h4>{order.orderCode}</h4>
                        <p className="coordinator">{order.coordinatorName}</p>
                        <p className="amount">
                          {order.totalAmount.toLocaleString()} VND
                        </p>
                        <p className="date">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="order-actions">
                        <button
                          className="action-btn approve"
                          onClick={() => handleApprove(order.id)}
                        >
                          <FiCheckCircle size={16} />
                          Duyệt
                        </button>

                        <button
                          className="action-btn reject"
                          onClick={() => handleReject(order.id)}
                        >
                          <FiXCircle size={16} />
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HÀNH ĐỘNG NHANH */}
            <div className="section">
              <h2>Thao tác nhanh</h2>
              <div className="quick-actions">
                <Link to="/accounting/orders" className="action-btn primary">
                  Xem tất cả đơn hàng
                </Link>
                <Link to="/accounting/reports" className="action-btn secondary">
                  Tạo báo cáo
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}