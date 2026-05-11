import { Link } from 'react-router-dom'
import { FiHome, FiShoppingCart, FiUsers, FiSettings, FiFileText } from 'react-icons/fi'
import './Sidebar.css'
import { useOperationStore } from '../../services/store'

export default function Sidebar() {
  const userRole = localStorage.getItem('userRole')

  const getNavItems = () => {
    switch (userRole) {
      case 'Admin':
        return [
          { to: '/admin', label: 'Tổng Quan', icon: FiHome },
          { to: '/admin/users', label: 'Người Dùng', icon: FiUsers },
          { to: '/admin/settings', label: 'Cài Đặt', icon: FiSettings },
        ]
      case 'Accounting':
        return [
          { to: '/accounting', label: 'Tổng Quan', icon: FiHome },
          { to: '/accounting/orders', label: 'Đơn Hàng', icon: FiShoppingCart },
          { to: '/accounting/reports', label: 'Báo Cáo', icon: FiFileText },
        ]
      case 'Coordinator':
        return [
          { to: '/coordinator', label: 'Tổng Quan', icon: FiHome },
          { to: '/coordinator/orders', label: 'Đơn Hàng', icon: FiShoppingCart },
          { to: '/coordinator/orders/create', label: 'Tạo Đơn Hàng', icon: FiFileText },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>CÔNG TY CỔ PHẦN BÊ TÔNG TÂY ĐÔ</h2>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.to} to={item.to} className="nav-link">
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
