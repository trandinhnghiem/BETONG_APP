import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

import {
  FiLogOut,
  FiBell
} from 'react-icons/fi'

import apiClient from '../../services/api'
import socket from '../../socket'

import './Header.css'

interface NotificationType {

  Id: number

  Title: string

  Message: string

  IsRead: boolean

  CreatedAt: string

}

export default function Header() {

  const navigate = useNavigate()

  const [showNotifications, setShowNotifications] =
    useState<boolean>(false)

  const [notifications, setNotifications] =
    useState<NotificationType[]>([])

  const [hasNew, setHasNew] =
    useState<boolean>(false)

  const stationId =
    localStorage.getItem('stationId')

  // =========================
  // LOAD NOTIFICATIONS
  // =========================
  useEffect(() => {

    if (!stationId) return

    loadNotifications()

  }, [])

  const loadNotifications = async () => {

    try {

      const res = await apiClient.get(
        `/api/notifications?stationId=${stationId}`
      )

      setNotifications(res.data)

      const unread =
        res.data.some(
          (n: NotificationType) => !n.IsRead
        )

      setHasNew(unread)

    } catch (err) {

      console.error(err)

    }

  }

  // =========================
  // SOCKET REALTIME
  // =========================
  useEffect(() => {

    if (!stationId) return

    socket.emit(
      'join_station',
      stationId
    )

    const handleApproved = (
      data: NotificationType
    ) => {

      setNotifications(prev => [
        data,
        ...prev
      ])

      setHasNew(true)

    }

    socket.on(
      'order_approved',
      handleApproved
    )

    return () => {

      socket.off(
        'order_approved',
        handleApproved
      )

    }

  }, [])

  // =========================
  // MARK READ
  // =========================
  const markAsRead = async (
    id: number
  ) => {

    try {

      await apiClient.put(
        `/api/notifications/${id}/read`
      )

      const updated =
        notifications.map(n =>
          n.Id === id
            ? {
                ...n,
                IsRead: true
              }
            : n
        )

      setNotifications(updated)

      const stillUnread =
        updated.some(n => !n.IsRead)

      setHasNew(stillUnread)

    } catch (err) {

      console.error(err)

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

        {/* LEFT */}
        <div className="header-left">

          <h1>
            HỆ THỐNG QUẢN LÝ KINH DOANH
          </h1>

          <div className="marquee-wrapper">

            <div className="marquee-text">

              🎉 Chào mừng bạn trở lại!
              Hôm nay là {
                new Date().toLocaleDateString(
                  'vi-VN'
                )
              }.
              Chúc bạn một ngày làm việc hiệu quả và thành công! 🚀

            </div>

          </div>

        </div>

        {/* RIGHT */}
        <div className="header-actions">

          <div className="notification-wrapper">

            <button
              className={`notification-btn ${hasNew ? 'shake' : ''}`}
              onClick={() =>
                setShowNotifications(
                  !showNotifications
                )
              }
            >

              <FiBell size={20} />

              {
                notifications.filter(
                  n => !n.IsRead
                ).length > 0 && (

                  <span className="notification-badge">

                    {
                      notifications.filter(
                        n => !n.IsRead
                      ).length
                    }

                  </span>

                )
              }

            </button>

            {showNotifications && (

              <div className="notification-dropdown">

                <div className="notification-header">

                  <h3>Thông báo</h3>

                </div>

                <div className="notification-list">

                  {
                    notifications.length === 0 && (

                      <div className="notification-empty">

                        Không có thông báo

                      </div>

                    )
                  }

                  {notifications.map(item => (

                    <div
                      key={item.Id}
                      className={`notification-item ${!item.IsRead ? 'unread' : ''}`}
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