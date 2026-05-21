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

  const dropdownRef =
    useRef<HTMLDivElement>(null)

  const [showNotifications,
    setShowNotifications] =
    useState(false)

  const [notifications,
    setNotifications] =
    useState<NotificationItem[]>([])

  const [notificationCount,
    setNotificationCount] =
    useState(0)

  const [hasNotification,
    setHasNotification] =
    useState(false)

  const [marquee,
    setMarquee] =
    useState('')

  // =========================
  // LOAD NOTIFICATIONS
  // =========================
  const loadNotifications =
    async () => {

    const token =
      localStorage.getItem('token')

    // chưa login thì bỏ qua
    if (!token) return

    try {

      const res =
        await apiClient.get(
          '/api/notifications'
        )

      setNotifications(res.data)

      const unread =
        res.data.filter(
          (n: any) => !n.IsRead
        ).length

      setNotificationCount(unread)

    } catch (err: any) {

      // tránh spam lỗi 403
      if (err?.response?.status !== 403) {
        console.error(err)
      }
    }
  }

  // =========================
  // CHECK APPROVED ORDERS
  // =========================
  const checkApprovedOrders =
    async () => {

    const token =
      localStorage.getItem('token')

    const userRole =
      localStorage.getItem('userRole')

    // chưa login hoặc không phải trạm
    if (!token || userRole !== 'Station') {
      return
    }

    try {

      const res =
        await apiClient.get(
          '/api/orders/station-orders'
        )

      const approvedOrders =
        res.data.filter(
          (o: any) =>
            o.OrderStatus === 'Approved'
        )

      if (approvedOrders.length > 0) {

        setMarquee(
          '🔔 Có đơn hàng đang chờ trạm xử lý'
        )

        setHasNotification(true)

      } else {

        setMarquee('')

        setHasNotification(false)
      }

    } catch (err: any) {

      // bỏ qua lỗi 403
      if (err?.response?.status !== 403) {
        console.error(err)
      }
    }
  }

  // =========================
  // INIT
  // =========================
  useEffect(() => {

    const token =
      localStorage.getItem('token')

    // chưa đăng nhập thì không gọi API
    if (!token) return

    loadNotifications()

    checkApprovedOrders()

    const userId =
      localStorage.getItem('userId')

    const userRole =
      localStorage.getItem('userRole')

    const stationId =
      localStorage.getItem('stationId')

    // join room user
    if (userId) {

      socket.emit(
        'join_user',
        String(userId)
      )
    }

    // join room role
    if (userRole) {

      socket.emit(
        'join_role',
        String(userRole)
      )
    }

    // join room station
    if (stationId) {

      socket.emit(
        'join_station',
        String(stationId)
      )
    }

    // =========================
    // SOCKET RECEIVE
    // =========================
    const handleApproved =
      async (data: any) => {

      console.log(
        '🔔 order_approved:',
        data
      )

      await loadNotifications()

      await checkApprovedOrders()

      setHasNotification(true)

      setTimeout(() => {

        setHasNotification(false)

      }, 5000)
    }

    socket.on(
      'order_approved',
      handleApproved
    )

    const interval = setInterval(() => {

      checkApprovedOrders()

    }, 5000)

    return () => {

      socket.off(
        'order_approved',
        handleApproved
      )

      clearInterval(interval)
    }

  }, [])

  // =========================
  // CLICK OUTSIDE
  // =========================
  useEffect(() => {

    const handleClickOutside =
      (e: MouseEvent) => {

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          e.target as Node
        )
      ) {

        setShowNotifications(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {

      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }

  }, [])

  // =========================
  // MARK ALL AS READ
  // =========================
  const markAllAsRead =
    async () => {

    try {

      await apiClient.put(
        '/api/notifications/mark-read',
        {}
      )

      setNotifications(prev =>
        prev.map(item => ({
          ...item,
          IsRead: true
        }))
      )

      setNotificationCount(0)

    } catch (err) {

      console.error(err)
    }
  }

  // =========================
  // MARK SINGLE
  // =========================
  const markAsRead =
    async (id: number) => {

    try {

      await apiClient.put(
        `/api/notifications/${id}/read`
      )

      setNotifications(prev =>
        prev.map(item => {

          if (item.Id === id) {

            return {
              ...item,
              IsRead: true
            }
          }

          return item
        })
      )

      setNotificationCount(prev =>
        prev > 0
          ? prev - 1
          : 0
      )

    } catch (err) {

      console.error(err)
    }
  }

  // =========================
  // OPEN DROPDOWN
  // =========================
  const handleOpenNotifications =
    async () => {

    const token =
      localStorage.getItem('token')

    if (!token) return

    const newState =
      !showNotifications

    setShowNotifications(newState)

    setHasNotification(false)

    if (newState) {

      await markAllAsRead()

      setNotifications(prev =>
        prev.map(item => ({
          ...item,
          IsRead: true
        }))
      )

      setNotificationCount(0)
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

          <h1>
            HỆ THỐNG QUẢN LÝ KINH DOANH
          </h1>

        </div>

        <div className="header-actions">

          {/* NOTIFICATION */}
          <div
            className="notification-wrapper"
            ref={dropdownRef}
          >

            <div
              className={`header-bell ${
                hasNotification
                  ? 'ringing'
                  : ''
              }`}
              onClick={
                handleOpenNotifications
              }
            >

              <FiBell size={22} />

              {notificationCount > 0 && (

                <span className="bell-badge">

                  {notificationCount}

                </span>

              )}

            </div>

            {/* DROPDOWN */}
            {showNotifications && (

              <div className="notification-dropdown">

                <div className="notification-header">

                  <h3>
                    Thông báo
                  </h3>

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
                      className={`notification-item ${
                        item.IsRead
                          ? 'read'
                          : 'unread'
                      }`}
                      onClick={() =>
                        markAsRead(item.Id)
                      }
                    >

                      <div>

                        <h4>
                          {item.Title}
                        </h4>

                        <p>
                          {item.Message}
                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </div>

          {/* LOGOUT */}
          <button
            className="logout-btn"
            onClick={handleLogout}
          >

            <FiLogOut size={18} />

            <span>
              Đăng xuất
            </span>

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