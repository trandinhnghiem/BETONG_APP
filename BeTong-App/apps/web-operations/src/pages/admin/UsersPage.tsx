import { useEffect, useState } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiUser, FiMail, FiPhone } from 'react-icons/fi'
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

  // ================= XÓA USER =================
  const handleDelete = async (userId: number) => {
    if (!confirm('Bạn có chắc muốn xóa user này không?')) return

    try {
      await apiClient.delete(`/api/users/${userId}`)
      fetchUsers()
    } catch (err: any) {
      alert('Xóa thất bại: ' + (err.response?.data?.error || 'Lỗi không xác định'))
    }
  }

  // ================= MÀU ROLE =================
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'red'
      case 'Accounting': return 'blue'
      case 'Coordinator': return 'green'
      default: return 'gray'
    }
  }

  // ================= UI =================
  return (
    <div className="users-page">
      {/* HEADER */}
      <div className="page-header">
        <h1>Quản lý người dùng</h1>
        <button
          className="create-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <FiPlus size={16} />
          Tạo người dùng
        </button>
      </div>

      {/* FORM TẠO USER */}
      {showCreateForm && (
        <div className="create-form">
          <h3>Tạo người dùng mới</h3>

          {error && <div className="error-message">{error}</div>}

          <div className="form-grid">
            <input
              placeholder="Tên đăng nhập"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />

            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              type="password"
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <input
              placeholder="Họ và tên"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />

            <input
              placeholder="Số điện thoại"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="Admin">Quản trị</option>
              <option value="Accounting">Kế toán</option>
              <option value="Coordinator">Điều phối</option>
            </select>
          </div>

          <div className="form-actions">
            <button onClick={() => setShowCreateForm(false)}>
              Hủy
            </button>

            <button onClick={handleCreate} disabled={creating}>
              {creating ? 'Đang tạo...' : 'Tạo'}
            </button>
          </div>
        </div>
      )}

      {/* DANH SÁCH USER */}
      <div className="users-section">
        <h2>Tất cả người dùng ({users.length})</h2>

        {loading ? (
          <div className="loading">Đang tải dữ liệu...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <FiUser size={48} />
            <p>Không có người dùng nào</p>
          </div>
        ) : (
          <div className="users-grid">
            {users.map((user) => (
              <div key={user.Id} className="user-card">
                <div className="user-header">
                  <FiUser size={24} />
                  <div>
                    <h3>{user.FullName}</h3>
                    <p>@{user.Username}</p>
                  </div>
                  <span className={`role ${getRoleColor(user.Role)}`}>
                    {user.Role}
                  </span>
                </div>

                <div className="user-body">
                  <p><FiMail /> {user.Email}</p>
                  {user.Phone && <p><FiPhone /> {user.Phone}</p>}
                  <p>Trạng thái: {user.IsActive ? 'Hoạt động' : 'Ngưng hoạt động'}</p>
                </div>

                <div className="user-actions">
                  <button className="edit-btn">
                    <FiEdit size={14} /> Sửa
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(user.Id)}
                  >
                    <FiTrash2 size={14} /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}