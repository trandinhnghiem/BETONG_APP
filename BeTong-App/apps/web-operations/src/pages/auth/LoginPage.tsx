import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../services/api'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHints, setShowHints] = useState(false)

  const testAccounts = [
    { username: 'admin', password: 'Admin@123456', role: 'Admin' },
    { username: 'account', password: '123456', role: 'Accounting' },
    { username: 'coor', password: '123456', role: 'Coordinator' },
    { username: 'station', password: '123456', role: 'Station' }
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.post('/api/auth/login', {
        username,
        password
      })

      if (response.data.token) {
        // Lưu token và thông tin user
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('userId', response.data.user.id)
        localStorage.setItem('userRole', response.data.user.role)
        localStorage.setItem('userName', response.data.user.username)
        localStorage.setItem('fullName', response.data.user.fullName)

        // Điều hướng theo role
        const role = response.data.user.role
        if (role === 'Admin') {
          navigate('/admin')
        } else if (role === 'Accounting') {
          navigate('/accounting')
        } else if (role === 'Coordinator') {
          navigate('/coordinator')
        } else if (role === 'Station') {
          navigate('/station')
        } else {
          navigate('/')
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const handleTestLogin = (account: typeof testAccounts[0]) => {
    setUsername(account.username)
    setPassword(account.password)
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Cổng vận hành</h1>
          <p>Hệ thống quản lý kiểm tra</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-footer">
          <button 
            type="button"
            className="hints-toggle"
            onClick={() => setShowHints(!showHints)}
          >
            {showHints ? 'Ẩn' : 'Hiển thị'} tài khoản test
          </button>
          
          {showHints && (
            <div className="test-accounts">
              <p className="test-accounts-title">Tài khoản test:</p>
              {testAccounts.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  className="test-account-btn"
                  onClick={() => handleTestLogin(account)}
                  disabled={loading}
                >
                  <span className="account-info">
                    <strong>{account.role}</strong><br/>
                    {account.username} / {account.password}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}