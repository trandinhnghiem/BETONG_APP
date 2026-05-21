import { useEffect, useState, useMemo } from 'react'
import apiClient from '../../services/api'
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

  const filtered = useMemo(() => {
    return reports.filter((r) => {

      const okSearch =
        r.OrderCode?.toLowerCase().includes(search.toLowerCase()) ||
        r.CustomerName?.toLowerCase().includes(search.toLowerCase())

      const okStatus =
        statusFilter === 'ALL' || r.OrderStatus === statusFilter

      return okSearch && okStatus
    })
  }, [reports, search, statusFilter])

  const totalRevenue = filtered.reduce(
    (s, i) => s + Number(i.TotalAmount || 0),
    0
  )

  const completed = filtered.filter(i => i.OrderStatus === 'Completed').length
  const rejected = filtered.filter(i => i.OrderStatus === 'Rejected').length
  const pending = filtered.filter(i => i.OrderStatus === 'Pending').length

  const mapStatus = (status: string) => {
    switch (status) {
      case 'Completed': return 'Hoàn thành'
      case 'Rejected': return 'Bị từ chối'
      case 'Pending': return 'Chờ xử lý'
      case 'Approved': return 'Đã duyệt'
      default: return status
    }
  }

  return (
    <div className="admin-report">

      {/* HEADER */}
      <div className="admin-report__header">
        <div>
          <h1>Báo cáo hệ thống</h1>
          <p>Quản lý doanh thu và đơn hàng</p>
        </div>
      </div>

      {/* KPI */}
      <div className="admin-report__kpi">

        <div className="admin-report__card">
          <span>Tổng đơn</span>
          <h2>{filtered.length}</h2>
        </div>

        <div className="admin-report__card admin-report__card--green">
          <span>Doanh thu</span>
          <h2>{totalRevenue.toLocaleString('vi-VN')}đ</h2>
        </div>

        <div className="admin-report__card admin-report__card--blue">
          <span>Hoàn thành</span>
          <h2>{completed}</h2>
        </div>

        <div className="admin-report__card admin-report__card--red">
          <span>Bị từ chối</span>
          <h2>{rejected}</h2>
        </div>

      </div>

      {/* FILTER */}
      <div className="admin-report__filter">

        <input
          placeholder="Tìm mã đơn / khách hàng..."
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
          <option value="Rejected">Bị từ chối</option>
          <option value="Approved">Đã duyệt</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="table-card-adminreports">

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
            {filtered.map((item) => (
              <tr key={item.Id}>

                <td>{item.OrderCode}</td>

                <td>{item.CustomerName || 'Khách lẻ'}</td>

                <td className="money">
                  {Number(item.TotalAmount).toLocaleString('vi-VN')}đ
                </td>

                <td>
                  <span className={`status ${item.OrderStatus}`}>
                    {mapStatus(item.OrderStatus)}
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