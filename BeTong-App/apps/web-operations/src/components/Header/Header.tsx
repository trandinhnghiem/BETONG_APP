import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { FiLogOut, FiBell } from 'react-icons/fi'

import socket from '../../socket'
import apiClient from '../../services/api'

import './Header.css'

interface NotificationItem {
  Id: number
  Title: string
  Message: string
  IsRead: boolean
  CreatedAt: string
}

export default function Header() {

  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const [hasNotification, setHasNotification] = useState(false)
  const [marquee, setMarquee] = useState('')

  // =========================
  // UNREAD COUNT (FIX CHUẨN)
  // =========================
  const unreadCount = notifications.filter(n => !n.IsRead).length

  // =========================
  // LOAD + SOCKET
  // =========================
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await apiClient.get('/api/notifications')
        setNotifications(res.data)
      } catch (err) {
        console.error(err)
      }
    }

    loadNotifications()

    const userId = localStorage.getItem('userId')
    const userRole = localStorage.getItem('userRole')
    const stationId = localStorage.getItem('stationId')

    if (userId) {
      socket.emit('join_user', userId)
    }
    if (userRole) {
      socket.emit('join_role', userRole)
    }
    if (stationId) {
      socket.emit('join_station', String(stationId))
    }

    const handleNotification = (data: any) => {
      const notification = {
        Id: data.Id || Date.now(),
        Title: data.Title || data.title || 'Thông báo mới',
        Message: data.Message || data.message || 'Bạn có thông báo mới.',
        IsRead: false,
        CreatedAt: data.CreatedAt || new Date().toISOString()
      }

      setNotifications(prev => [notification, ...prev])
      setHasNotification(true)
      setMarquee(notification.Message)

      setTimeout(() => {
        setHasNotification(false)
      }, 3000)

      let count = 0
      const interval = setInterval(() => {
        count++
        if (count >= 3) {
          clearInterval(interval)
          setMarquee('')
        }
      }, 3000)
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [])

  // =========================
  // CLICK OUTSIDE (FIX DROPDOWN)
  // =========================
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // =========================
  // MARK AS READ
  // =========================
  const markAsRead = async (id: number) => {
    try {

      await apiClient.put(`/api/notifications/${id}/read`)

      setNotifications(prev => {
        const updated = prev.map(item =>
          item.Id === id ? { ...item, IsRead: true } : item
        )

        return [...updated]
      })

    } catch (err) {
      console.error(err)
    }
  }

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <header className="header">

      <div className="header-content">

        <div className="header-left">
          <h1>HỆ THỐNG QUẢN LÝ KINH DOANH</h1>
        </div>

        <div className="header-actions">

          {/* NOTIFICATION */}
          <div className="notification-wrapper" ref={dropdownRef}>

            <div
              className={`header-bell ${hasNotification ? 'ringing' : ''}`}
              onClick={() => {
                setShowNotifications(prev => !prev)
                setNotifications(prev =>
                  prev.map(n => ({ ...n, IsRead: true }))
                )
              }}
            >
              <FiBell size={22} />

              {unreadCount > 0 && (
                <span className="bell-badge">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* DROPDOWN FIXED */}
            {showNotifications && (
              <div className="notification-dropdown">

                <div className="notification-header">
                  <h3>Thông báo</h3>
                </div>

                <div className="notification-list">

                  {notifications.length === 0 && (
                    <div className="notification-empty">
                      Không có thông báo
                    </div>
                  )}

                  {notifications.map(item => (
                    <div
                      key={item.Id}
                      className={`notification-item ${item.IsRead ? 'read' : 'unread'}`}
                      onClick={() => markAsRead(item.Id)}
                    >
                      <h4>{item.Title}</h4>
                      <p>{item.Message}</p>
                    </div>
                  ))}

                </div>

              </div>
            )}

          </div>

          {/* LOGOUT */}
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut size={18} />
            <span>Đăng Xuất</span>
          </button>

        </div>

      </div>

      {/* MARQUEE */}
      {marquee && (
        <div className="notification-marquee">
          <div className="notification-marquee-text">
            {marquee}
          </div>
        </div>
      )}

    </header>
  )
}