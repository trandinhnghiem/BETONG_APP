import apiClient from '../../services/api'

export default function AccountingReportsPage() {
  const handleExport = async () => {
    try {
      const response = await apiClient.get('/api/orders/export', {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'orders-report.csv'
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
    <div className="reports-page">
      <h1>Báo cáo đơn hàng</h1>
      <p>Xuất báo cáo đơn hàng cho kế toán.</p>
      <button onClick={handleExport}>Tải báo cáo</button>
    </div>
  )
}
