import { useEffect, useState, useMemo } from 'react'
import {
  FiDownload,
  FiRefreshCw
} from 'react-icons/fi'

import * as ExcelJS from 'exceljs'

import apiClient from '../../services/api'
import './ReportsPage.css'

export default function ReportsPage() {

  const [reports, setReports] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {

      setLoading(true)

      const res =
        await apiClient.get('/api/reports')

      setReports(
        Array.isArray(res.data)
          ? res.data
          : res.data?.data || []
      )

    } catch (err) {

      console.error(err)

    } finally {

      setLoading(false)
    }
  }

  // =========================
  // FILTER
  // =========================
  const filtered = useMemo(() => {

    return reports.filter((r) => {

      const okSearch =
        r.OrderCode?.toLowerCase().includes(
          search.toLowerCase()
        ) ||
        r.CustomerName?.toLowerCase().includes(
          search.toLowerCase()
        )

      const okStatus =
        statusFilter === 'ALL' ||
        r.OrderStatus === statusFilter

      return okSearch && okStatus
    })

  }, [reports, search, statusFilter])

  // =========================
  // KPI
  // =========================
  const totalRevenue = filtered.reduce(
    (s, i) =>
      s + Number(i.TotalAmount || 0),
    0
  )

  const completed = filtered.filter(
    i => i.OrderStatus === 'Completed'
  ).length

  const rejected = filtered.filter(
    i => i.OrderStatus === 'Rejected'
  ).length

  const pending = filtered.filter(
    i => i.OrderStatus === 'Pending Approval'
  ).length

  // =========================
  // STATUS MAP
  // =========================
  const mapStatus = (
    status: string
  ) => {

    switch (status) {

      case 'Completed':
        return 'Hoàn thành'

      case 'Pending Approval':
        return 'Chờ duyệt'

      case 'Approved':
        return 'Đã duyệt'

      case 'Sent':
        return 'Đã gửi'

      case 'Delivered':
        return 'Đã giao'

      case 'Uploading':
        return 'Đang tải lên'

      case 'In Transit':
        return 'Đang vận chuyển'
        
      case 'REJECTED':
      case 'Rejected':
      case 'Reject':
        return 'Từ chối'

      default:
        return status || '-'
    }
  }

  // =========================
  // FORMAT DATE
  // FIX GIỐNG DATABASE
  // =========================
  const formatDateTime = (
  dateString: string
) => {

  if (!dateString) return ''

  // yyyy-mm-dd hh:mm:ss.xxx
  const date =
    dateString.replace('T', ' ')

  const parts =
    date.split(' ')

  if (parts.length < 2)
    return dateString

  const datePart =
    parts[0]

  const timePart =
    parts[1].split('.')[0]

  const [year, month, day] =
    datePart.split('-')

  return `${timePart} ${day}/${month}/${year}`
}

  // =========================
  // EXPORT EXCEL
  // =========================
  const handleExportExcel =
    async () => {

    try {

      setLoading(true)

      const workbook =
        new ExcelJS.Workbook()

      const sheet =
        workbook.addWorksheet(
          'Bao Cao He Thong'
        )

      // =====================
      // COLUMNS
      // =====================
      sheet.columns = [
        {
          header: 'Mã đơn',
          key: 'OrderCode',
          width: 24
        },
        {
          header: 'Khách hàng',
          key: 'CustomerName',
          width: 28
        },
        {
          header: 'Doanh thu',
          key: 'TotalAmount',
          width: 20
        },
        {
          header: 'Trạng thái',
          key: 'OrderStatus',
          width: 20
        },
        {
          header: 'Ngày tạo',
          key: 'CreatedAt',
          width: 28
        }
      ]

      // =====================
      // HEADER STYLE
      // =====================
      const headerRow =
        sheet.getRow(1)

      headerRow.font = {
        bold: true,
        color: {
          argb: 'FFFFFFFF'
        }
      }

      headerRow.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      }

      headerRow.eachCell((cell) => {

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: '2563EB'
          }
        }

        cell.border = {
          top: {
            style: 'thin'
          },
          left: {
            style: 'thin'
          },
          bottom: {
            style: 'thin'
          },
          right: {
            style: 'thin'
          }
        }
      })

      // =====================
      // DATA
      // =====================
      filtered.forEach((item) => {

        sheet.addRow({

          OrderCode:
            item.OrderCode || '',

          CustomerName:
            item.CustomerName ||
            'Khách lẻ',

          TotalAmount:
            Number(
              item.TotalAmount || 0
            ).toLocaleString(
              'vi-VN'
            ) + 'đ',

          OrderStatus:
            mapStatus(
              item.OrderStatus
            ),

          // FIX GIỜ GIỐNG DATABASE
          CreatedAt:
            formatDateTime(
              item.CreatedAt
            )
        })
      })

      // =====================
      // STYLE DATA ROW
      // =====================
      sheet.eachRow(
        (row, rowNumber) => {

          if (rowNumber > 1) {

            row.eachCell((cell) => {

              cell.border = {
                top: {
                  style: 'thin'
                },
                left: {
                  style: 'thin'
                },
                bottom: {
                  style: 'thin'
                },
                right: {
                  style: 'thin'
                }
              }

              cell.alignment = {
                vertical: 'middle',
                horizontal: 'left'
              }
            })
          }
        }
      )

      // =====================
      // DOWNLOAD
      // =====================
      const buffer =
        await workbook.xlsx.writeBuffer()

      const blob =
        new Blob(
          [buffer],
          {
            type:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        )

      const url =
        window.URL.createObjectURL(blob)

      const a =
        document.createElement('a')

      a.href = url

      a.download =
        'bao-cao-he-thong.xlsx'

      document.body.appendChild(a)

      a.click()

      a.remove()

      window.URL.revokeObjectURL(url)

    } catch (err) {

      console.error(err)

      alert(
        'Không thể xuất Excel'
      )

    } finally {

      setLoading(false)
    }
  }

  return (
    <div className="admin-report">

      {/* HEADER */}
      <div className="admin-report__header">

        <div>

          <h1>
            Báo cáo hệ thống
          </h1>

          <p>
            Quản lý doanh thu
            và đơn hàng
          </p>

        </div>

        <div className="admin-report__header-actions">

          <button
            className="export-btn"
            onClick={
              handleExportExcel
            }
            disabled={loading}
          >

            <FiDownload size={18} />

            Xuất Excel

          </button>

          <button
            className="refresh-btn"
            onClick={fetchReports}
            disabled={loading}
          >

            <FiRefreshCw size={18} />

            Tải lại

          </button>

        </div>

      </div>

      {/* KPI */}
      <div className="admin-report__kpi">

        <div className="admin-report__card">

          <span>
            Tổng đơn
          </span>

          <h2>
            {filtered.length}
          </h2>

        </div>

        <div className="admin-report__card admin-report__card--green">

          <span>
            Doanh thu
          </span>

          <h2>
            {totalRevenue.toLocaleString(
              'vi-VN'
            )}đ
          </h2>

        </div>

        <div className="admin-report__card admin-report__card--blue">

          <span>
            Hoàn thành
          </span>

          <h2>
            {completed}
          </h2>

        </div>

        <div className="admin-report__card admin-report__card--red">

          <span>
            Bị từ chối
          </span>

          <h2>
            {rejected}
          </h2>

        </div>

      </div>

      {/* FILTER */}
      <div className="admin-report__filter">

        <input
          placeholder="Tìm mã đơn / khách hàng..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >

          <option value="ALL">
            Tất cả
          </option>

          <option value="Pending">
            Chờ xử lý
          </option>

          <option value="Completed">
            Hoàn thành
          </option>

          <option value="Rejected">
            Bị từ chối
          </option>

          <option value="Approved">
            Đã duyệt
          </option>

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

            {filtered.length > 0 ? (

              filtered.map((item) => (

                <tr key={item.Id}>

                  <td>
                    {item.OrderCode}
                  </td>

                  <td>
                    {item.CustomerName ||
                      'Khách lẻ'}
                  </td>

                  <td className="money">

                    {Number(
                      item.TotalAmount
                    ).toLocaleString(
                      'vi-VN'
                    )}đ

                  </td>

                  <td>

                    <span
                      className={`status ${item.OrderStatus}`}
                    >

                      {mapStatus(
                        item.OrderStatus
                      )}

                    </span>

                  </td>

                  <td>

                    {formatDateTime(
                      item.CreatedAt
                    )}

                  </td>

                </tr>

              ))

            ) : (

              <tr>

                <td
                  colSpan={5}
                  className="empty-row"
                >

                  Không có dữ liệu

                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

      {/* LOADING */}
      {loading && (

        <div className="loading-overlay">

          <div className="loader"></div>

          <span>
            Đang xử lý...
          </span>

        </div>

      )}

    </div>
  )
}