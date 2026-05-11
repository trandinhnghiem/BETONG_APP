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
          { to: '/admin', label: 'Dashboard', icon: FiHome },
          { to: '/admin/users', label: 'Users', icon: FiUsers },
          { to: '/admin/settings', label: 'Settings', icon: FiSettings },
        ]
      case 'Accounting':
        return [
          { to: '/accounting', label: 'Dashboard', icon: FiHome },
          { to: '/accounting/orders', label: 'Orders', icon: FiShoppingCart },
          { to: '/accounting/reports', label: 'Reports', icon: FiFileText },
        ]
      case 'Coordinator':
        return [
          { to: '/coordinator', label: 'Dashboard', icon: FiHome },
          { to: '/coordinator/orders', label: 'Orders', icon: FiShoppingCart },
          { to: '/coordinator/orders/create', label: 'Create Order', icon: FiFileText },
        ]
      case 'Station':
        return [
          { to: '/station', label: 'Dashboard', icon: FiHome },
          { to: '/station/orders', label: 'Received Orders', icon: FiShoppingCart },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Quản Lý Giao Nhận</h2>
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
