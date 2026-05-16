import apiClient from '../../services/api'
import './ReportsPage.css'

export default function AccountingReportsPage() {
  const handleExport = async () => {
    try {
      const response = await apiClient.get('/api/orders/export', {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'orders-report.json'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Lỗi khi tải báo cáo:', error)
      alert('Không thể tải báo cáo vào lúc này.')
    }
  }

  return (
    <div className="reports-page section">
      <div className="section-header">
        <div className="header-content">
          <h1>Báo cáo & Xuất dữ liệu</h1>
          <p>Xuất dữ liệu đơn hàng và báo cáo thống kê</p>
        </div>
        <div></div>
      </div>

      <p>Chọn phạm vi ngày và xuất báo cáo (JSON)</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        <input type="date" />
        <span>—</span>
        <input type="date" />
        <button className="action-btn primary" onClick={handleExport}>Tải báo cáo</button>
      </div>
    </div>
  )
}
