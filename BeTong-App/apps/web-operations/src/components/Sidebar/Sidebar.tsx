import { Link, useLocation } from 'react-router-dom'
import companyLogo from '../../assets/logo.png'
import {
  FiHome,
  FiShoppingCart,
  FiUsers,
  FiSettings,
  FiFileText,
  FiMenu,
  FiMoon,
  FiSun,
  FiBarChart2,
  FiMapPin
} from 'react-icons/fi'
import { useEffect, useState } from 'react'
import './Sidebar.css'

export default function Sidebar() {
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [systemInfo, setSystemInfo] = useState({
    companyName: 'BÊ TÔNG TÂY ĐÔ',
    systemName: 'CRM / ERP SYSTEM'
  })

  const userRole = localStorage.getItem('userRole')

  const userData = JSON.parse(
    localStorage.getItem('user') || '{}'
  )

  const displayName =
    userData.FullName ||
    userData.fullName ||
    userData.Username ||
    userData.username ||
    userRole

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const savedSettings = localStorage.getItem('systemSettings')

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)

      setSystemInfo({
        companyName: parsed.companyName,
        systemName: parsed.systemName
      })
    }
  }, [])

  const getNavItems = () => {
    switch (userRole) {
      case 'Admin':
        return [
          { to: '/admin', label: 'Tổng quan', icon: FiHome },
          { to: '/admin/users', label: 'Người dùng', icon: FiUsers },
          { to: '/admin/settings', label: 'Cài đặt', icon: FiSettings },
          { to: '/admin/reports', label: 'Báo cáo', icon: FiFileText },
          { to: '/admin/statistics', label: 'Thống kê', icon: FiBarChart2 },
        ]

      case 'Accounting':
        return [
          { to: '/accounting', label: 'Tổng quan', icon: FiHome },
          { to: '/accounting/orders', label: 'Đơn hàng', icon: FiShoppingCart },
          { to: '/accounting/reports', label: 'Báo cáo', icon: FiFileText },
          { to: '/accounting/stations', label: 'Quản lý trạm', icon: FiMapPin },
        ]

      case 'Coordinator':
        return [
          { to: '/coordinator', label: 'Tổng quan', icon: FiHome },
          { to: '/coordinator/orders', label: 'Đơn hàng', icon: FiShoppingCart },
          { to: '/coordinator/create-order', label: 'Tạo đơn hàng', icon: FiFileText },
          { to: '/coordinator/reports', label: 'Báo cáo', icon: FiBarChart2 },
          { to: '/coordinator/stations', label: 'Quản lý trạm', icon: FiMapPin },
        ]

      case 'Station':
        return [
          { to: '/station', label: 'Tổng quan', icon: FiHome },
          { to: '/station/orders', label: 'Đơn hàng', icon: FiShoppingCart },
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
            <img
              src={companyLogo}
              alt="Logo"
              className="company-logo"
            />
          </div>

          <div className="logo-text">
            <h2>{systemInfo.companyName}</h2>
            <p>{systemInfo.systemName}</p>
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
            {displayName?.split(' ')[1]?.charAt(0) || 'U'}
          </div>

          <div className="user-info">
            <h4 title={displayName}>
              {displayName}
            </h4>

            <span className="status-badge online">
              Hoạt động
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}