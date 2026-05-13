import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FiLogOut, FiBell } from 'react-icons/fi'
import './Header.css'

export default function Header() {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] =
  useState(false)

  const notifications = [
    {
      id: 1,
      title: 'Đơn hàng mới',
      message: 'Đơn hàng #ORD-001 vừa được tạo',
      time: '5 phút trước'
    },
    {
      id: 2,
      title: 'Backup hoàn tất',
      message: 'Hệ thống đã sao lưu dữ liệu thành công',
      time: '1 giờ trước'
    },
    {
      id: 3,
      title: 'Người dùng mới',
      message: 'Tài khoản coordinator1 vừa đăng ký',
      time: '2 giờ trước'
    }
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')

    navigate('/login')
  }

  return (
    <header className="header">
     <div className="header-content">
    <div className="header-left">
      <h1>HỆ THỐNG QUẢN LÝ KINH DOANH</h1>

      <div className="marquee-wrapper">
        <div className="marquee-text">
          🎉 Chào mừng bạn trở lại! Hôm nay là {new Date().toLocaleDateString('vi-VN')}.
          Chúc bạn một ngày làm việc hiệu quả và thành công! 🚀
        </div>
      </div>
    </div>
        <div className="header-actions">
          <div className="notification-wrapper">
            <button
              className="notification-btn"
              onClick={() =>
                setShowNotifications(!showNotifications)
              }
            >
              <FiBell size={20} />

              <span className="notification-badge">
                {notifications.length}
              </span>
            </button>

            {showNotifications && (
              <div className="notification-dropdown">

                <div className="notification-header">
                  <h3>Thông báo</h3>
                </div>

                <div className="notification-list">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className="notification-item"
                    >
                      <div className="notification-dot"></div>

                      <div className="notification-content">
                        <h4>{item.title}</h4>

                        <p>{item.message}</p>

                        <span>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            <FiLogOut size={18} />

            <span>Đăng Xuất</span>
          </button>
        </div>
      </div>
    </header>
  )
}