import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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

  const [showNotifications, setShowNotifications] =
    useState(false)

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([])

  // =========================
  // LOAD NOTIFICATIONS
  // =========================
  useEffect(() => {

    loadNotifications()

    const stationId =
      localStorage.getItem('stationId')

    if (stationId) {

      socket.emit(
        'join_station',
        stationId
      )

    }

    // =========================
    // REALTIME SOCKET
    // =========================
    socket.on(
      'order_approved',
      (newNotification: NotificationItem) => {

        setNotifications(prev => [
          newNotification,
          ...prev
        ])

      }
    )

    return () => {

      socket.off('order_approved')

    }

  }, [])

  // =========================
  // LOAD API
  // =========================
  const loadNotifications = async () => {

    try {

      const stationId =
        localStorage.getItem('stationId')

      if (!stationId) return

      const response =
        await apiClient.get(
          `/api/notifications?stationId=${stationId}`
        )

      setNotifications(response.data)

    } catch (error) {

      console.error(error)

    }

  }

  // =========================
  // READ NOTIFICATION
  // =========================
  const markAsRead = async (id: number) => {

    try {

      await apiClient.put(
        `/api/notifications/${id}/read`
      )

      setNotifications(prev =>
        prev.map(item =>
          item.Id === id
            ? {
                ...item,
                IsRead: true
              }
            : item
        )
      )

    } catch (error) {

      console.error(error)

    }

  }

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = () => {

    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    localStorage.removeItem('stationId')

    navigate('/login')

  }

  return (
    <header className="header">

      <div className="header-content">

        <div className="header-left">

          <h1>
            HỆ THỐNG QUẢN LÝ KINH DOANH
          </h1>

          <div className="marquee-wrapper">

            <div className="marquee-text">

              🎉 Chào mừng bạn trở lại!
              Hôm nay là {
                new Date().toLocaleDateString('vi-VN')
              }.
              Chúc bạn một ngày làm việc hiệu quả!

            </div>

          </div>

        </div>

        <div className="header-actions">

          {/* ========================= */}
          {/* NOTIFICATION */}
          {/* ========================= */}

          <div className="notification-wrapper">

            <button
              className="notification-btn"
              onClick={() =>
                setShowNotifications(
                  !showNotifications
                )
              }
            >

              <FiBell size={20} />

              <span className="notification-badge">

                {
                  notifications.filter(
                    n => !n.IsRead
                  ).length
                }

              </span>

            </button>

            {showNotifications && (

              <div className="notification-dropdown">

                <div className="notification-header">

                  <h3>Thông báo</h3>

                </div>

                <div className="notification-list">

                  {notifications.length === 0 && (

                    <div
                      className="notification-empty"
                    >

                      Không có thông báo

                    </div>

                  )}

                  {notifications.map((item) => (

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

                      <div className="notification-dot"></div>

                      <div className="notification-content">

                        <h4>
                          {item.Title}
                        </h4>

                        <p>
                          {item.Message}
                        </p>

                        <span>
                          {
                            new Date(
                              item.CreatedAt
                            ).toLocaleString(
                              'vi-VN'
                            )
                          }
                        </span>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </div>

          {/* ========================= */}
          {/* LOGOUT */}
          {/* ========================= */}

          <button
            className="logout-btn"
            onClick={handleLogout}
          >

            <FiLogOut size={18} />

            <span>
              Đăng Xuất
            </span>

          </button>

        </div>

      </div>

    </header>
  )
}