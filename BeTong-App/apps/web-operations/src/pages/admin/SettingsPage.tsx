import { useEffect, useState } from 'react'

import {
  FiSave,
  FiBell,
  FiShield,
  FiDatabase,
  FiGlobe
} from 'react-icons/fi'

import './SettingsPage.css'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: 'BÊ TÔNG TÂY ĐÔ',
    systemName: 'CRM / ERP SYSTEM',
    emailNotification: true,
    maintenanceMode: false,
    autoBackup: true,
    language: 'vi',
    timezone: 'Asia/Ho_Chi_Minh'
  })

  const [saving, setSaving] = useState(false)
  useEffect(() => {
  const savedSettings = localStorage.getItem('systemSettings')

  if (savedSettings) {
    setSettings(JSON.parse(savedSettings))
  }
}, [])

const handleSave = async () => {
  try {
    setSaving(true)

    // Lưu vào localStorage
    localStorage.setItem(
      'systemSettings',
      JSON.stringify(settings)
    )

    setTimeout(() => {
      alert('Lưu cài đặt thành công!')
      setSaving(false)

      // reload để sidebar cập nhật
      window.location.reload()
    }, 1000)

  } catch (error) {
    setSaving(false)
    alert('Lưu thất bại!')
  }
}

  return (
    <div className="settings-page">
      {/* HEADER */}
      <div className="settings-header">
        <div>
          <h1>
            Cài đặt hệ thống
          </h1>
          <p>Quản lý cấu hình và thiết lập hệ thống</p>
        </div>

        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          <FiSave />
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>

      {/* GRID */}
      <div className="settings-grid">

        {/* THÔNG TIN HỆ THỐNG */}
        <div className="settings-card">
          <div className="card-title">
            <FiDatabase />
            <h3>Thông tin hệ thống</h3>
          </div>

          <div className="form-group">
            <label>Tên công ty</label>

            <input
              type="text"
              value={settings.companyName}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  companyName: e.target.value
                })
              }
            />
          </div>

          <div className="form-group">
            <label>Tên hệ thống</label>

            <input
              type="text"
              value={settings.systemName}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  systemName: e.target.value
                })
              }
            />
          </div>
        </div>

        {/* THÔNG BÁO */}
        <div className="settings-card">
          <div className="card-title">
            <FiBell />
            <h3>Thông báo</h3>
          </div>

          <div className="toggle-item">
            <div>
              <h4>Email thông báo</h4>
              <p>Nhận email khi có hoạt động mới</p>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={settings.emailNotification}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    emailNotification: e.target.checked
                  })
                }
              />

              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* BẢO MẬT */}
        <div className="settings-card">
          <div className="card-title">
            <FiShield />
            <h3>Bảo mật</h3>
          </div>

          <div className="toggle-item">
            <div>
              <h4>Chế độ bảo trì</h4>
              <p>Tạm khóa hệ thống để bảo trì</p>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenanceMode: e.target.checked
                  })
                }
              />

              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div>
              <h4>Tự động backup</h4>
              <p>Sao lưu dữ liệu định kỳ</p>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autoBackup: e.target.checked
                  })
                }
              />

              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* NGÔN NGỮ */}
        <div className="settings-card">
          <div className="card-title">
            <FiGlobe />
            <h3>Khu vực</h3>
          </div>

          <div className="form-group">
            <label>Ngôn ngữ</label>

            <select
              value={settings.language}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  language: e.target.value
                })
              }
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="form-group">
            <label>Múi giờ</label>

            <select
              value={settings.timezone}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  timezone: e.target.value
                })
              }
            >
              <option value="Asia/Ho_Chi_Minh">
                Asia/Ho_Chi_Minh
              </option>

              <option value="UTC">
                UTC
              </option>
            </select>
          </div>
        </div>

      </div>
    </div>
  )
}