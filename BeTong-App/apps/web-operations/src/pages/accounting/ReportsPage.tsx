import { useEffect, useMemo, useState } from 'react'
import {
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiFilter,
  FiRefreshCw,
  FiShoppingCart,
  FiTruck
} from 'react-icons/fi'

import apiClient from '../../services/api'

import './ReportsPage.css'

import { Bar } from 'react-chartjs-2'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'

import * as ExcelJS from 'exceljs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
)

interface OrderRow {
  Id: number
  OrderCode: string
  SourceStation?: string
  DestinationStation?: string
  TotalAmount?: number
  OrderStatus?: string
  CreatedAt?: string
}

export default function AccountingReportsPage() {
  const today = new Date()

  const defaultStart = new Date()

  defaultStart.setDate(today.getDate() - 7)

  const [startDate, setStartDate] = useState(
    defaultStart.toISOString().slice(0, 10)
  )

  const [endDate, setEndDate] = useState(
    today.toISOString().slice(0, 10)
  )

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

useEffect(() => {
  loadOrders(
    defaultStart.toISOString().slice(0, 10),
    today.toISOString().slice(0, 10)
  )
}, [])

const loadOrders = async (
  start?: string,
  end?: string
) => {
  try {
    setLoading(true)
    setError(null)

    const response = await apiClient.get(
      '/api/orders/export'
    )

    const rawData = Array.isArray(response.data)
      ? response.data
      : response.data?.data || []

    let parsed: OrderRow[] = rawData.map((o: any) => ({
      Id: o.Id ?? o.id,
      OrderCode: o.OrderCode ?? o.orderCode ?? '',
      SourceStation: o.SourceStation ?? '',
      DestinationStation: o.DestinationStation ?? '',
      TotalAmount: o.TotalAmount ?? o.totalAmount ?? 0,
      OrderStatus: o.OrderStatus ?? o.orderStatus ?? '',
      CreatedAt: o.CreatedAt ?? o.createdAt ?? ''
    }))

    // =========================
    // FILTER FRONTEND
    // =========================

    if (start || end) {
      parsed = parsed.filter(order => {
        if (!order.CreatedAt) return false

        const orderDate = new Date(order.CreatedAt)

        if (isNaN(orderDate.getTime())) {
          return false
        }

        // reset time
        orderDate.setHours(0, 0, 0, 0)

        let valid = true

        if (start) {
          const startDateObj = new Date(start)
          startDateObj.setHours(0, 0, 0, 0)

          valid =
            valid &&
            orderDate >= startDateObj
        }

        if (end) {
          const endDateObj = new Date(end)
          endDateObj.setHours(23, 59, 59, 999)

          valid =
            valid &&
            orderDate <= endDateObj
        }

        return valid
      })
    }

    console.log('FILTERED DATA:', parsed)

    setOrders(parsed)
  } catch (err: any) {
    console.error(err)

    setOrders([])

    setError(
      err?.response?.data?.message ||
        err?.message ||
        'Không thể tải dữ liệu báo cáo'
    )
  } finally {
    setLoading(false)
  }
}

  const handleFilter = async () => {
    await loadOrders(startDate, endDate)
  }

  const resetFilters = async () => {
    setStartDate('')
    setEndDate('')

    await loadOrders('', '')
  }

  const summary = useMemo(() => {
    const totalOrders = orders.length

    const totalRevenue = orders.reduce(
      (sum, item) => sum + (item.TotalAmount || 0),
      0
    )

    const pendingOrders = orders.filter(
      x => x.OrderStatus === 'Pending Approval'
    ).length

    const completedOrders = orders.filter(
      x => x.OrderStatus === 'Completed'
    ).length

    const inTransitOrders = orders.filter(x =>
      [
        'Approved',
        'Sent',
        'Delivered',
        'Uploading',
        'In Transit'
      ].includes(x.OrderStatus || '')
    ).length

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      inTransitOrders
    }
  }, [orders])

  const chartData = useMemo(() => {
  const grouped = new Map<string, number>()

  orders.forEach(order => {
    if (!order.CreatedAt) return

    const date = new Date(order.CreatedAt)

    if (isNaN(date.getTime())) return

    const key = date.toISOString().slice(0, 10)

    grouped.set(
      key,
      (grouped.get(key) || 0) + 1
    )
  })

  const sortedEntries = Array.from(
    grouped.entries()
  ).sort(
    (a, b) =>
      new Date(a[0]).getTime() -
      new Date(b[0]).getTime()
  )

  const labels = sortedEntries.map(item =>
    new Date(item[0]).toLocaleDateString('vi-VN')
  )

  const values = sortedEntries.map(
    item => item[1]
  )

  return {
    labels,

    datasets: [
      {
        label: 'Số đơn hàng',
        data: values,
        backgroundColor: '#4f46e5',
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 48,
        hoverBackgroundColor: '#4338ca'
      }
    ]
  }
}, [orders])

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false
      },

      tooltip: {
        backgroundColor: '#111827',
        padding: 12,
        cornerRadius: 10
      }
    },

    scales: {
      x: {
        grid: {
          display: false
        },

        ticks: {
          color: '#6b7280'
        }
      },

      y: {
        beginAtZero: true,

        ticks: {
          stepSize: 1,
          color: '#6b7280'
        },

        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'Completed':
        return 'success'

      case 'Pending Approval':
        return 'warning'

      case 'Approved':
      case 'In Transit':
      case 'Sent':
      case 'Delivered':
        return 'info'

      default:
        return 'default'
    }
  }

  const handleExportExcel = async () => {
    try {
      setLoading(true)

      const workbook = new ExcelJS.Workbook()

      const sheet = workbook.addWorksheet(
        'Orders Report'
      )

      sheet.columns = [
        { header: 'ID', key: 'Id', width: 10 },
        { header: 'Mã đơn', key: 'OrderCode', width: 22 },
        { header: 'Trạm gửi', key: 'SourceStation', width: 22 },
        { header: 'Trạm nhận', key: 'DestinationStation', width: 22 },
        { header: 'Tổng tiền', key: 'TotalAmount', width: 18 },
        { header: 'Trạng thái', key: 'OrderStatus', width: 20 },
        { header: 'Ngày tạo', key: 'CreatedAt', width: 22 }
      ]

      orders.forEach(item => {
        sheet.addRow({
          Id: item.Id,
          OrderCode: item.OrderCode,
          SourceStation: item.SourceStation,
          DestinationStation: item.DestinationStation,
          TotalAmount: item.TotalAmount,
          OrderStatus: item.OrderStatus,
          CreatedAt: item.CreatedAt
            ? new Date(
                item.CreatedAt
              ).toLocaleString('vi-VN')
            : ''
        })
      })

      sheet.getRow(1).font = {
        bold: true
      }

      const buffer = await workbook.xlsx.writeBuffer()

      const blob = new Blob([buffer], {
        type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')

      a.href = url

      a.download = `bao-cao-don-hang.xlsx`

      document.body.appendChild(a)

      a.click()

      a.remove()

      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Không thể xuất Excel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Báo cáo & Thống kê</h1>

          <p>
            Theo dõi doanh thu và hoạt động đơn hàng
          </p>
        </div>

        <button
          className="action-btn primary"
          onClick={handleExportExcel}
        >
          <FiDownload size={18} />
          Xuất Excel
        </button>
      </div>

      <div className="reports-filter-card">
        <div className="filter-header">
          <div className="filter-title">
            <FiFilter size={18} />
            Bộ lọc báo cáo
          </div>
        </div>

        <div className="filter-grid">
          <div className="filter-item">
            <label>Từ ngày</label>

            <div className="input-wrap">
              <FiCalendar size={16} />

              <input
                type="date"
                value={startDate}
                onChange={e =>
                  setStartDate(e.target.value)
                }
              />
            </div>
          </div>

          <div className="filter-item">
            <label>Đến ngày</label>

            <div className="input-wrap">
              <FiCalendar size={16} />

              <input
                type="date"
                value={endDate}
                onChange={e =>
                  setEndDate(e.target.value)
                }
              />
            </div>
          </div>

          <div className="filter-actions">
            <button
              className="action-btn primary"
              onClick={handleFilter}
              disabled={loading}
            >
              <FiFilter size={16} />
              Lọc dữ liệu
            </button>

            <button
              className="action-btn secondary"
              onClick={resetFilters}
              disabled={loading}
            >
              <FiRefreshCw size={16} />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-icon">
            <FiShoppingCart size={24} />
          </div>

          <div className="stat-content">
            <h3>Tổng đơn hàng</h3>

            <div className="stat-value">
              {summary.totalOrders}
            </div>

            <div className="stat-subtitle">
              Trong khoảng thời gian lọc
            </div>
          </div>
        </div>

        <div className="stat-card stat-card--success">
          <div className="stat-icon">
            <FiDollarSign size={24} />
          </div>

          <div className="stat-content">
            <h3>Doanh thu</h3>

            <div className="stat-value money">
              {formatCurrency(
                summary.totalRevenue
              )}
            </div>

            <div className="stat-subtitle">
              Tổng doanh thu
            </div>
          </div>
        </div>

        <div className="stat-card stat-card--warning">
          <div className="stat-icon">
            <FiClock size={24} />
          </div>

          <div className="stat-content">
            <h3>Chờ duyệt</h3>

            <div className="stat-value">
              {summary.pendingOrders}
            </div>

            <div className="stat-subtitle">
              Đơn cần xử lý
            </div>
          </div>
        </div>

        <div className="stat-card stat-card--info">
          <div className="stat-icon">
            <FiTruck size={24} />
          </div>

          <div className="stat-content">
            <h3>Đang vận chuyển</h3>

            <div className="stat-value">
              {summary.inTransitOrders}
            </div>

            <div className="stat-subtitle">
              Trong lộ trình
            </div>
          </div>
        </div>

        <div className="stat-card stat-card--accent">
          <div className="stat-icon">
            <FiCheckCircle size={24} />
          </div>

          <div className="stat-content">
            <h3>Hoàn thành</h3>

            <div className="stat-value">
              {summary.completedOrders}
            </div>

            <div className="stat-subtitle">
              Đã giao thành công
            </div>
          </div>
        </div>
      </div>

      <div className="reports-container">
        <div className="chart-card">
          <div className="card-header">
            <h3>
              Biểu đồ đơn hàng theo ngày
            </h3>

            <p>
              Thống kê số lượng đơn hàng theo
              thời gian
            </p>
          </div>

          <div className="chart-wrapper">
            <Bar
              data={chartData}
              options={chartOptions}
            />
          </div>
        </div>

        <div className="table-card">
          <div className="card-header">
            <h3>Danh sách đơn hàng</h3>

            <p>
              Tổng cộng {orders.length} đơn
              hàng
            </p>
          </div>

          <div className="table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Trạm gửi</th>
                  <th>Trạm nhận</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>

              <tbody>
                {orders.length > 0 ? (
                  orders.map(order => (
                    <tr key={order.Id}>
                      <td>
                        {order.OrderCode}
                      </td>

                      <td>
                        {order.SourceStation}
                      </td>

                      <td>
                        {
                          order.DestinationStation
                        }
                      </td>

                      <td>
                        {formatCurrency(
                          order.TotalAmount || 0
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            order.OrderStatus
                          )}`}
                        >
                          {order.OrderStatus}
                        </span>
                      </td>

                      <td>
                        {order.CreatedAt
                          ? new Date(
                              order.CreatedAt
                            ).toLocaleDateString(
                              'vi-VN'
                            )
                          : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="empty-state"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      )}
    </div>
  )
}