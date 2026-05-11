import { useEffect, useState } from 'react'
import { FiShoppingCart, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi'
import OrderTable from '../../components/OrderTable/OrderTable'
import apiClient from '../../services/api'
import './Dashboard.css'

interface DashboardStats {
  totalOrders: number
  pendingApproval: number
  approved: number
  rejected: number
}

interface Order {
  id: number
  orderCode: string
  status: string
  createdAt: string
  totalAmount: number
  coordinatorName: string
  approvalStatus: string
}

export default function AccountingDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Fetch from API
      const response = await apiClient.get('/api/orders')
      const allOrders = response.data || []

      // Mock data for demo
      const mockOrders: Order[] = [
        {
          id: 1,
          orderCode: 'ORD-2026-001',
          status: 'Pending Approval',
          createdAt: new Date().toISOString(),
          totalAmount: 5000000,
          coordinatorName: 'Nguyễn Văn A',
          approvalStatus: 'Pending'
        },
        {
          id: 2,
          orderCode: 'ORD-2026-002',
          status: 'Approved',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          totalAmount: 7500000,
          coordinatorName: 'Trần Thị B',
          approvalStatus: 'Approved'
        }
      ]

      setOrders(mockOrders)
      setStats({
        totalOrders: mockOrders.length,
        pendingApproval: mockOrders.filter(o => o.approvalStatus === 'Pending').length,
        approved: mockOrders.filter(o => o.approvalStatus === 'Approved').length,
        rejected: mockOrders.filter(o => o.approvalStatus === 'Rejected').length
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Tổng đơn hàng',
      value: stats.totalOrders,
      icon: FiShoppingCart,
      color: 'blue'
    },
    {
      title: 'Chờ phê duyệt',
      value: stats.pendingApproval,
      icon: FiClock,
      color: 'orange'
    },
    {
      title: 'Đã phê duyệt',
      value: stats.approved,
      icon: FiCheckCircle,
      color: 'green'
    },
    {
      title: 'Từ chối',
      value: stats.rejected,
      icon: FiXCircle,
      color: 'red'
    }
  ]

  const handleOrderAction = (order: Order, action: string) => {
    console.log(`Action: ${action} on order:`, order)
    // TODO: Implement order actions
  }

  return (
    <div className="accounting-dashboard">
      <div className="dashboard-header">
        <h1>Bảng điều khiển kế toán</h1>
        <p>Quản lý và phê duyệt đơn hàng</p>
      </div>

      {loading ? (
        <div className="loading">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="stats-grid">
            {statCards.map((card, index) => {
              const Icon = card.icon
              return (
                <div key={index} className={`stat-card ${card.color}`}>
                  <div className="stat-icon">
                    <Icon size={24} />
                  </div>
                  <div className="stat-content">
                    <h3>{card.title}</h3>
                    <p className="stat-value">{card.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="orders-section">
            <h2>Đơn hàng cần phê duyệt</h2>
            <OrderTable
              orders={orders}
              onActionClick={handleOrderAction}
              actionButtons={[
                { label: 'Phê duyệt', action: 'approve', className: 'success' },
                { label: 'Từ chối', action: 'reject', className: 'danger' }
              ]}
            />
          </div>
        </>
      )}
    </div>
  )
}