import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { FiLogOut, FiBell, FiCheck, FiTrash2 } from 'react-icons/fi'

import socket from '../../socket'
import apiClient from '../../services/api'

import './Header.css'

interface NotificationItem {
  Id: number
  Title: string
  Message: string
  NotificationType: string
  IsRead: boolean
  CreatedAt: string
  RelatedOrderId: number | null
}

// Icon cho từng loại notification
const typeConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  OrderPendingApproval: { icon: '📋', color: '#d97706', bgColor: '#fffbeb' },
  OrderApproved: { icon: '✅', color: '#16a34a', bgColor: '#f0fdf4' },
  OrderRejected: { icon: '❌', color: '#dc2626', bgColor: '#fef2f2' },
  OrderCancelled: { icon: '🚫', color: '#9333ea', bgColor: '#faf5ff' },
  OrderCompleted: { icon: '🎉', color: '#2563eb', bgColor: '#eff6ff' },
  OrderProcessing: { icon: '⚙️', color: '#0891b2', bgColor: '#ecfeff' },
  OrderDelivering: { icon: '🚚', color: '#4f46e5', bgColor: '#eef2ff' },
  DebtWarning: { icon: '⚠️', color: '#ea580c', bgColor: '#fff7ed' },
  PaymentConfirmed: { icon: '💰', color: '#7c3aed', bgColor: '#f5f3ff' },
  DebtPaid: { icon: '💳', color: '#059669', bgColor: '#ecfdf5' },
  SYSTEM: { icon: '🔔', color: '#435ebe', bgColor: '#f3f6ff' },
}

const getTypeConfig = (type: string) => typeConfig[type] || typeConfig.SYSTEM

const formatTimeAgo = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHour < 24) return `${diffHour} giờ trước`
  if (diffDay < 7) return `${diffDay} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

export default function Header() {

  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // =========================
  // MARQUEE: Dòng chạy ngang khi có đơn chờ xử lý
  // Giống hệt code cũ: chỉ Station, dùng /api/orders/station-orders, filter Approved
  // =========================
  const [marquee, setMarquee] = useState('')
  const userRole = localStorage.getItem('userRole')

  const checkApprovedOrders = async () => {
    const token = localStorage.getItem('token')
    if (!token || userRole !== 'Station') return

    try {
      const res = await apiClient.get('/api/orders/station-orders')
      const approvedOrders = res.data.filter((o: any) => o.OrderStatus === 'Approved')
      if (approvedOrders.length > 0) {
        setMarquee(`🔔 Có ${approvedOrders.length} đơn hàng đang chờ trạm xử lý`)
      } else {
        setMarquee('')
      }
    } catch (err: any) {
      if (err?.response?.status !== 403) {
        console.error('checkApprovedOrders error:', err)
      }
    }
  }

  // Click marquee → chuyển đến trang đơn hàng
  const handleMarqueeClick = () => {
    navigate('/engineer/orders')
  }

  // =========================
  // LOAD NOTIFICATIONS
  // =========================
  const loadNotifications = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await apiClient.get('/api/notifications?limit=30')
      setNotifications(res.data)
      const total = await apiClient.get('/api/notifications/unread-count')
      setNotificationCount(total.data.total)
    } catch (err: any) {
      if (err?.response?.status !== 403) {
        console.error('loadNotifications error:', err)
      }
    }
  }

  // =========================
  // INIT: Load + Socket
  // =========================
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Load lần đầu
    loadNotifications()
    checkApprovedOrders()

    const userId = localStorage.getItem('userId')
    const stationId = localStorage.getItem('stationId')

    // Join socket rooms
    if (userId) {
      socket.emit('join_user', String(userId))
    }
    if (userRole) {
      socket.emit('join_role', String(userRole))
    }
    if (stationId) {
      socket.emit('join_station', String(stationId))
    }

    // ✅ Listen event "notification" — nhận TẤT CẢ thông báo
    const handleNotification = (data: any) => {
      console.log('🔔 notification received:', data)

      // Thêm notification mới vào đầu danh sách
      setNotifications(prev => [{
        Id: data.id,
        Title: data.title,
        Message: data.message,
        NotificationType: data.type,
        IsRead: false,
        CreatedAt: data.createdAt || new Date().toISOString(),
        RelatedOrderId: data.relatedOrderId || null
      }, ...prev])

      // Tăng badge count
      setNotificationCount(prev => prev + 1)

      // Nếu là OrderApproved → reload approved orders cho marquee (Station)
      if (data.type === 'OrderApproved' && userRole === 'Station') {
        checkApprovedOrders()
      }
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [])

  // ✅ Polling checkApprovedOrders mỗi 15 giây (nhẹ hơn 5s cũ, vẫn đủ nhanh)
  useEffect(() => {
    if (userRole !== 'Station') return
    const interval = setInterval(checkApprovedOrders, 15000)
    return () => clearInterval(interval)
  }, [userRole])

  // =========================
  // CLICK OUTSIDE
  // =========================
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // =========================
  // MARK SINGLE AS READ
  // =========================
  const markAsRead = async (id: number) => {
    try {
      await apiClient.put(`/api/notifications/${id}/read`)

      setNotifications(prev =>
        prev.map(item =>
          item.Id === id ? { ...item, IsRead: true } : item
        )
      )

      setNotificationCount(prev => (prev > 0 ? prev - 1 : 0))

    } catch (err) {
      console.error('markAsRead error:', err)
    }
  }

  // =========================
  // MARK ALL AS READ
  // =========================
  const markAllAsRead = async () => {
    try {
      await apiClient.put('/api/notifications/mark-all-read')

      setNotifications(prev =>
        prev.map(item => ({ ...item, IsRead: true }))
      )

      setNotificationCount(0)

    } catch (err) {
      console.error('markAllAsRead error:', err)
    }
  }

  // =========================
  // CLICK NOTIFICATION → ĐÁNH DẤU ĐÃ ĐỌC + CHUYỂN TRANG
  // =========================
  const handleNotificationClick = async (item: NotificationItem) => {
    // Đánh dấu đã đọc nếu chưa đọc
    if (!item.IsRead) {
      await markAsRead(item.Id)
    }

    // Nếu có RelatedOrderId → chuyển đến trang đơn hàng
    if (item.RelatedOrderId) {
      setShowNotifications(false)

      const role = localStorage.getItem('userRole')

      if (role === 'Accounting') {

          navigate('/accounting/orders')

        } else if (role === 'Station') {

          navigate('/station/orders')

        } else if (role === 'Engineer') {

          navigate('/engineer/orders')

        } else if (role === 'Coordinator') {

          navigate('/coordinator/orders')

        }
    }
  }

  // =========================
  // DELETE NOTIFICATION
  // =========================
  const handleDeleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()

    try {
      await apiClient.delete(`/api/notifications/${id}`)

      const deleted = notifications.find(n => n.Id === id)
      setNotifications(prev => prev.filter(n => n.Id !== id))

      if (deleted && !deleted.IsRead) {
        setNotificationCount(prev => (prev > 0 ? prev - 1 : 0))
      }

    } catch (err) {
      console.error('deleteNotification error:', err)
    }
  }

  // =========================
  // TOGGLE DROPDOWN
  // =========================
  const handleToggleNotifications = () => {
    setShowNotifications(prev => !prev)
  }

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>HỆ THỐNG QUẢN LÝ KINH DOANH</h1>
          </div>

          <div className="header-actions">
            {/* NOTIFICATION */}
            <div className="notification-wrapper" ref={dropdownRef}>
              <div
                className={`header-bell${notificationCount > 0 ? ' ringing' : ''}`}
                onClick={handleToggleNotifications}
              >
                <FiBell size={22} />

                {notificationCount > 0 && (
                  <span className="bell-badge">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </div>

              {/* DROPDOWN */}
              {showNotifications && (
                <div className="notification-dropdown">
                  {/* Header */}
                  <div className="notification-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Thông báo</h3>
                      {notificationCount > 0 && (
                        <button
                          className="mark-all-btn"
                          onClick={markAllAsRead}
                          title="Đánh dấu tất cả đã đọc"
                        >
                          <FiCheck size={14} />
                          <span>Đọc tất cả</span>
                        </button>
                      )}
                    </div>
                    {notificationCount > 0 && (
                      <p className="notification-subtitle">
                        {notificationCount} thông báo chưa đọc
                      </p>
                    )}
                  </div>

                  {/* List */}
                  <div className="notification-list">
                    {loading ? (
                      <div className="notification-empty">Đang tải...</div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
                        <div>Không có thông báo</div>
                      </div>
                    ) : (
                      notifications.map(item => {
                        const config = getTypeConfig(item.NotificationType)

                        return (
                          <div
                            key={item.Id}
                            className={`notification-item${item.IsRead ? ' read' : ' unread'}`}
                            onClick={() => handleNotificationClick(item)}
                          >
                            {/* Type icon */}
                            <div
                              className="notification-type-icon"
                              style={{ background: config.bgColor, color: config.color }}
                            >
                              {config.icon}
                            </div>

                            {/* Content */}
                            <div className="notification-content">
                              <div className="notification-title-row">
                                <h4 style={{ color: item.IsRead ? '#9ca3af' : '#25396f' }}>
                                  {item.Title}
                                </h4>
                                {!item.IsRead && <span className="unread-dot" />}
                              </div>
                              <p>{item.Message}</p>
                              <span className="notification-time">
                                {formatTimeAgo(item.CreatedAt)}
                              </span>
                            </div>

                            {/* Delete button */}
                            <button
                              className="notification-delete-btn"
                              onClick={(e) => handleDeleteNotification(e, item.Id)}
                              title="Xóa thông báo"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* LOGOUT */}
            <button className="logout-btn" onClick={handleLogout}>
              <FiLogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================= */}
      {/* MARQUEE: Dòng chữ chạy ngang */}
      {/* Giống hệt code cũ:       */}
      {/* - Chỉ hiện cho Station    */}
      {/* - Khi có đơn Approved     */}
      {/* - Click → trang đơn hàng  */}
      {/* ========================= */}
      {marquee && (
        <div className="notification-marquee" onClick={handleMarqueeClick}>
          <div className="notification-marquee-text">
            {marquee}
          </div>
        </div>
      )}
    </>
  )
}
