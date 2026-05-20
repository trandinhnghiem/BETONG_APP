import { useEffect, useState, useMemo } from 'react'
import apiClient from '../../../services/api'
import './ReportsPage.css'

export default function ReportsPage() {

  const [reports, setReports] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await apiClient.get('/api/reports')
      setReports(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  // FILTER + SEARCH
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {

      const matchSearch =
        item.OrderCode?.toLowerCase().includes(search.toLowerCase()) ||
        item.CustomerName?.toLowerCase().includes(search.toLowerCase())

      const matchStatus =
        statusFilter === 'ALL' ||
        item.OrderStatus === statusFilter

      return matchSearch && matchStatus
    })
  }, [reports, search, statusFilter])

  // EXPORT EXCEL
  const exportExcel = async () => {
    try {
      const res = await apiClient.get('/api/reports/export/excel', {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'report.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()

    } catch (err) {
      console.error(err)
    }
  }

  // EXPORT PDF
  const exportPDF = async () => {
    try {
      const res = await apiClient.get('/api/reports/export/pdf', {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'report.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()

    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="reports-page">

      {/* HEADER */}
      <div className="reports-header">
        <div>
          <h1>📊 Xuất báo cáo</h1>
          <p>Quản lý doanh thu & đơn hàng hệ thống</p>
        </div>

        <div className="report-actions">
          <button className="excel" onClick={exportExcel}>⬇ Excel</button>
          <button className="pdf" onClick={exportPDF}>🧾 PDF</button>
        </div>
      </div>

      {/* FILTER */}
      <div className="report-filters">

        <input
          type="text"
          placeholder="🔍 Tìm mã đơn / khách hàng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Tất cả</option>
          <option value="Pending">Chờ xử lý</option>
          <option value="Completed">Hoàn thành</option>
          <option value="Cancelled">Đã hủy</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="reports-table">

        <table>

          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Doanh thu</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>

          <tbody>

            {filteredReports.map((item) => (

              <tr key={item.Id}>

                <td>{item.OrderCode}</td>

                <td>
                  {item.CustomerName || 'Khách lẻ'}
                </td>

                <td>
                  {Number(item.TotalAmount).toLocaleString('vi-VN')}đ
                </td>

                <td>
                  <span className={`status ${item.OrderStatus}`}>
                    {item.OrderStatus}
                  </span>
                </td>

                <td>
                  {new Date(item.CreatedAt).toLocaleDateString('vi-VN')}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}