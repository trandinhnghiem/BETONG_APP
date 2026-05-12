import { useNavigate } from 'react-router-dom'
import { FiLogOut, FiBell } from 'react-icons/fi'
import './Header.css'

export default function Header() {
  const navigate = useNavigate()

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
          <button className="notification-btn">
            <FiBell size={20} />

            <span className="notification-badge">
              3
            </span>
          </button>

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