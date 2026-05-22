import { useEffect, useState } from 'react'
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiUser,
  FiSearch
} from 'react-icons/fi'

import apiClient from '../../services/api'
import './UsersPage.css'

interface User {
  Id: number
  Username: string
  Email: string
  FullName: string
  Phone: string
  Role: string
  IsActive: boolean
  CreatedAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'Coordinator'
  })

  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // ================= LẤY DANH SÁCH USER =================
  const fetchUsers = async () => {
    try {
      setLoading(true)

      const res = await apiClient.get('/api/users')

      const userData = res.data.data || res.data

      setUsers(
        Array.isArray(userData)
          ? userData.map((user: any) => ({
              Id: user.Id,
              Username: user.Username,
              Email: user.Email,
              FullName: user.FullName,
              Phone: user.Phone,
              Role: user.Role,
              IsActive: user.IsActive,
              CreatedAt: user.CreatedAt
            }))
          : []
      )
    } catch (err) {
      console.error('Lỗi khi lấy danh sách user:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // ================= TẠO USER =================
  const handleCreate = async () => {
    try {
      setCreating(true)
      setError('')

      await apiClient.post('/api/auth/register', form)

      setForm({
        username: '',
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: 'Coordinator'
      })

      setShowCreateForm(false)

      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Tạo thất bại')
    } finally {
      setCreating(false)
    }
  }

  // ================= XÓA USER (modal) =================
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    try {
      await apiClient.delete(`/api/users/${userToDelete.Id}`)
      setShowDeleteModal(false)
      setUserToDelete(null)
      fetchUsers()
    } catch (err: any) {
      alert('Xóa thất bại: ' + (err.response?.data?.error || 'Lỗi không xác định'))
    }
  }

  // ================= CHỈNH SỬA USER =================
  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setForm({
      username: user.Username,
      email: user.Email || '',
      password: '',
      fullName: user.FullName || '',
      phone: user.Phone || '',
      role: user.Role || 'Coordinator'
    })
    setShowCreateForm(true)
  }

  // ================= FILTER & SEARCH =================
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.FullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.Email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole =
      roleFilter === 'all' || user.Role === roleFilter

    return matchesSearch && matchesRole
  })

  // ================= UI =================
  return (
    <div className="users-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Quản lý người dùng</h1>
          <p>Quản lý thông tin người dùng và quyền truy cập</p>
        </div>

        <button
          className="create-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <FiPlus size={16} />
          Tạo người dùng
        </button>
      </div>

      {/* SEARCH & FILTER */}
      <div className="search-filter-section">
        <div className="search-filter-grid">
          <div className="search-input">
            <FiSearch className="search-icon" size={16} />

            <input
              type="text"
              placeholder="Tìm kiếm theo tên, username hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="Admin">Quản trị</option>
            <option value="Accounting">Kế toán</option>
            <option value="Coordinator">Điều phối</option>
            <option value="Engineer">Kỹ thuật viên công trình</option>
            <option value="Station">Trạm</option>
          </select>

          <button
            className="clear-filters-btn"
            onClick={() => {
              setSearchTerm('')
              setRoleFilter('all')
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* FORM TẠO USER */}
      {showCreateForm && (
        <div className="create-form">

          {/* HEADER */}
          <div className="create-form-header">
            <div>
              <h3>
                {editingUser ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}
              </h3>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* FORM */}
          <div className="form-grid">

            {/* USERNAME */}
            <div className="form-group">
              <label>Tên đăng nhập</label>

              <input
                type="text"
                placeholder="Nhập tên đăng nhập..."
                value={form.username}
                onChange={(e) =>
                  setForm({
                    ...form,
                    username: e.target.value
                  })
                }
              />
            </div>

            {/* EMAIL */}
            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                placeholder="Nhập email..."
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value
                  })
                }
              />
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label>Mật khẩu</label>

              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value
                  })
                }
              />
            </div>

            {/* FULL NAME */}
            <div className="form-group">
              <label>Họ và tên</label>

              <input
                type="text"
                placeholder="Nhập họ và tên..."
                value={form.fullName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fullName: e.target.value
                  })
                }
              />
            </div>

            {/* PHONE */}
            <div className="form-group">
              <label>Số điện thoại</label>

              <input
                type="text"
                placeholder="Nhập số điện thoại..."
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value
                  })
                }
              />
            </div>

            {/* ROLE */}
            <div className="form-group">
              <label>Vai trò</label>

              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value
                  })
                }
              >
                <option value="Admin">
                  Quản trị
                </option>

                <option value="Accounting">
                  Kế toán
                </option>

                <option value="Coordinator">
                  Điều phối
                </option>

                <option value="Engineer">
                  Kỹ thuật viên công trình
                </option>

                <option value="Station">
                  Trạm
                </option>
              </select>
            </div>

          </div>

          {/* ACTIONS */}
          <div className="form-actions">
            <button
              className="cancel-btn"
              onClick={() => {
                setShowCreateForm(false)
                setEditingUser(null)
                setForm({
                  username: '',
                  email: '',
                  password: '',
                  fullName: '',
                  phone: '',
                  role: 'Coordinator'
                })
              }}
            >
              Hủy
            </button>

            <button
              className="submit-btn"
              onClick={async () => {
                if (editingUser) {
                  try {
                    setCreating(true)

                    await apiClient.put(`/api/users/${editingUser.Id}`, {
                      fullName: form.fullName,
                      email: form.email,
                      phone: form.phone,
                      role: form.role,
                      password: form.password || undefined
                    })

                    setShowCreateForm(false)
                    setEditingUser(null)

                    setForm({
                      username: '',
                      email: '',
                      password: '',
                      fullName: '',
                      phone: '',
                      role: 'Coordinator'
                    })

                    fetchUsers()
                  } catch (err: any) {
                    setError(err.response?.data?.error || 'Cập nhật thất bại')
                  } finally {
                    setCreating(false)
                  }
                } else {
                  handleCreate()
                }
              }}
              disabled={creating}
            >
              {editingUser ? 'Lưu thay đổi' : (
                <>
                  <FiPlus size={16} />
                  {creating ? 'Đang tạo...' : 'Tạo người dùng'}
                </>
              )}
            </button>

          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && userToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xác nhận xóa</h3>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                Bạn có chắc muốn xóa tài khoản
                <strong> {userToDelete.FullName}</strong>
                (@{userToDelete.Username}) không?
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end',
                  marginTop: '16px'
                }}
              >
                <button
                  className="cancel-btn"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Hủy
                </button>

                <button
                  className="submit-btn"
                  onClick={handleDeleteConfirm}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH USER */}
      <div className="users-section">
        <h2>
          <FiUser size={20} />
          Tất cả người dùng ({filteredUsers.length})
        </h2>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            Đang tải dữ liệu...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <FiUser size={48} />

            <h3>Không tìm thấy người dùng</h3>

            <p>
              Không có người dùng nào phù hợp với bộ lọc hiện tại
            </p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Người dùng</th>

                <th className="role-column">
                  Vai trò
                </th>

                <th className="status-column">
                  Trạng thái
                </th>

                <th>Ngày tạo</th>

                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.Id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.FullName.charAt(0).toUpperCase()}
                      </div>

                      <div className="user-details">
                        <h4>{user.FullName}</h4>

                        <p>@{user.Username}</p>
                      </div>
                    </div>
                  </td>

                  <td className="role-column">
                    <span
                      className={`role-badge ${user.Role.toLowerCase()}`}
                    >
                      {user.Role}
                    </span>
                  </td>

                  <td className="status-column">
                    <span
                      className={`status-badge ${
                        user.IsActive
                          ? 'active'
                          : 'inactive'
                      }`}
                    >
                      {user.IsActive
                        ? 'Hoạt động'
                        : 'Ngưng hoạt động'}
                    </span>
                  </td>

                  <td>
                    {new Date(
                      user.CreatedAt
                    ).toLocaleDateString('vi-VN')}
                  </td>

                  <td>
                    <div className="user-actions">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEditClick(user)}
                      >
                        <FiEdit size={16} />
                      </button>

                      <button
                        className="action-btn delete"
                        onClick={() =>
                          handleDeleteClick(user)
                        }
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}