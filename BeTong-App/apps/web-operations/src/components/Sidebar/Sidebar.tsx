import { Link, useLocation } from 'react-router-dom'
import {
  FiHome,
  FiShoppingCart,
  FiUsers,
  FiSettings,
  FiFileText,
  FiMenu,
  FiMoon,
  FiSun,
  FiGrid,
} from 'react-icons/fi'
import { useEffect, useState } from 'react'
import './Sidebar.css'

export default function Sidebar() {
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const userRole = localStorage.getItem('userRole')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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

      case 'Station':
        return [
          { to: '/station', label: 'Dashboard', icon: FiHome },
          { to: '/station/orders', label: 'Đơn Hàng', icon: FiShoppingCart },
        ]

      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon">
            <FiGrid />
          </div>

          <div className="logo-text">
            <h2>BÊ TÔNG TÂY ĐÔ</h2>
            <p>CRM / ERP SYSTEM</p>
          </div>
        </div>

        <div className="sidebar-controls">
          <button
            className="control-btn"
            onClick={() =>
              setTheme(theme === 'light' ? 'dark' : 'light')
            }
          >
            {theme === 'light' ? <FiMoon /> : <FiSun />}
          </button>

          <button
            className="control-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            <FiMenu />
          </button>
        </div>
      </div>

      <div className="sidebar-menu">
        <div className="menu-title">Menu</div>

        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${
                location.pathname === item.to ? 'active' : ''
              }`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-box">
          <div className="user-avatar">
            {userRole?.charAt(0)}
          </div>

          <div className="user-info">
            <h4>{userRole}</h4>
            <p>Đang hoạt động</p>
          </div>
        </div>
      </div>
    </aside>
  )
}