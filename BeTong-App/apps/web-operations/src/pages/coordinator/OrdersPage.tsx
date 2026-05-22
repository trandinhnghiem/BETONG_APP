import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import './OrdersPage.css'
import * as ExcelJS from 'exceljs'
import { FiDownload } from 'react-icons/fi'

interface Order {
  id: number
  orderCode: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  rejectReason?: string
  createdAt: string
}

export default function CoordinatorOrdersPage() {

  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, search, status, fromDate, toDate])

  const fetchOrders = async () => {

    try {

      setLoading(true)

      const res =
        await apiClient.get('/api/orders/my-orders')

      const data = res.data.map((o: any) => ({

        id: o.Id,

        orderCode: o.OrderCode,

        destinationStation:
          o.DestinationStation,

        totalAmount:
          o.TotalAmount || 0,

        orderStatus:
          o.OrderStatus,

        // ✅ THÊM
        rejectReason:
          o.RejectReason,

        createdAt:
          o.CreatedAt

      }))

      setOrders(data)

    } catch (err) {

      console.error(err)
      setOrders([])

    } finally {

      setLoading(false)

    }
  }

  const applyFilters = () => {

    let result = [...orders]

    if (search) {

      result = result.filter(o =>
        o.orderCode
          .toLowerCase()
          .includes(search.toLowerCase())
      )

    }

    if (status !== 'All') {

      result = result.filter(
        o => o.orderStatus === status
      )

    }

    if (fromDate) {

      result = result.filter(o =>
        new Date(o.createdAt) >=
        new Date(fromDate)
      )

    }

    if (toDate) {

      const end = new Date(toDate)

      end.setHours(
        23,
        59,
        59,
        999
      )

      result = result.filter(o =>
        new Date(o.createdAt) <= end
      )

    }

    setFilteredOrders(result)
  }

  const reset = () => {

    setSearch('')
    setStatus('All')
    setFromDate('')
    setToDate('')

  }

  const statusMap: Record<string, string> = {

    'Draft': 'Đơn tạm',

    'Pending Approval':
      'Chờ duyệt',

    'Approved':
      'Đã duyệt',

    'Processing':
      'Đang xử lý',

    'Delivering':
      'Đang giao hàng',

    'Completed':
      'Hoàn thành',

    'Cancelled':
      'Đã hủy',

    'Rejected':
      'Từ chối',

    'Sent':
      'Đã gửi',

    'Delivered':
      'Đã giao'
  }

  const getStatusLabel = (
    status: string
  ) =>
    statusMap[status] || status

  const getStatusClass = (
    status: string
  ) =>
    status.replace(/\s/g, '')

  const sendOrderToStation = async (
    id: number
  ) => {

    try {

      await apiClient.post(
        `/api/orders/${id}/status`,
        {
          status:
            'Pending Approval'
        }
      )

      fetchOrders()

      alert('Đã gửi kế toán')

    } catch (err) {

      console.error(err)

      alert('Gửi thất bại')

    }
  }
    const handleExportExcel = async () => {

    try {

      const workbook =
        new ExcelJS.Workbook()

      const sheet =
        workbook.addWorksheet(
          'Coordinator Orders'
        )

      sheet.columns = [

        {
          header: 'Mã đơn',
          key: 'orderCode',
          width: 22
        },

        {
          header: 'Trạm',
          key: 'destinationStation',
          width: 28
        },

        {
          header: 'Tổng tiền',
          key: 'totalAmount',
          width: 20
        },

        {
          header: 'Trạng thái',
          key: 'orderStatus',
          width: 20
        },

        {
          header: 'Lý do từ chối',
          key: 'rejectReason',
          width: 40
        },

        {
          header: 'Ngày tạo',
          key: 'createdAt',
          width: 25
        }

      ]

      filteredOrders.forEach(order => {

        sheet.addRow({

          orderCode:
            order.orderCode,

          destinationStation:
            order.destinationStation,

          totalAmount:
            `${order.totalAmount.toLocaleString()} đ`,

          orderStatus:
            getStatusLabel(
              order.orderStatus
            ),

          rejectReason:
            order.rejectReason || '',

          createdAt:
            new Date(
              order.createdAt
            ).toLocaleString('vi-VN')

        })

      })

      sheet.getRow(1).font = {
        bold: true
      }

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
        window.URL.createObjectURL(
          blob
        )

      const a =
        document.createElement('a')

      a.href = url

      a.download =
        'don-hang-coordinator.xlsx'

      document.body.appendChild(a)

      a.click()

      a.remove()

      window.URL.revokeObjectURL(url)

    } catch (err) {

      console.error(err)

      alert(
        'Xuất Excel thất bại'
      )

    }

  }

  return (

    <div className="orders-dashboard">

            {/* HEADER */}
      <div className="page-header">

        <div>

          <h1>
            Đơn hàng của tôi
          </h1>

          <p>
            Quản lý và theo dõi
            trạng thái đơn hàng
          </p>

        </div>

        <button
          className="action-btn"
          onClick={handleExportExcel}
        >

          <FiDownload size={18} />

          Xuất Excel

        </button>

      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">

        <input
          placeholder="🔍 Tìm mã đơn..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
        >

          <option value="All">
            Tất cả trạng thái
          </option>

          <option value="Draft">
            Đơn tạm
          </option>

          <option value="Pending Approval">
            Chờ duyệt
          </option>

          <option value="Approved">
            Đã duyệt
          </option>

          <option value="Processing">
            Đang xử lý
          </option>

          <option value="Delivering">
            Đang giao hàng
          </option>

          <option value="Completed">
            Hoàn thành
          </option>

          <option value="Cancelled">
            Đã hủy
          </option>

          <option value="Rejected">
            Từ chối
          </option>

        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) =>
            setFromDate(e.target.value)
          }
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) =>
            setToDate(e.target.value)
          }
        />

        <button
          className="reset-btn"
          onClick={reset}
        >
          Reset
        </button>

      </div>

      {/* CONTENT */}
      {loading ? (

        <div className="loading">
          Đang tải...
        </div>

      ) : (

        <div className="table-card">

          <table>

            <thead>

              <tr>

                <th>Mã đơn</th>

                <th>Trạm</th>

                <th>Tổng tiền</th>

                <th>Trạng thái</th>

                <th>Ngày tạo</th>

                <th>Hành động</th>

              </tr>

            </thead>

            <tbody>

              {filteredOrders.map(o => (

                <tr key={o.id}>

                  <td className="code">
                    {o.orderCode}
                  </td>

                  <td>
                    {o.destinationStation}
                  </td>

                  <td className="money">
                    {o.totalAmount.toLocaleString()} đ
                  </td>

                  {/* ✅ STATUS */}
                  <td>

                    <span

                      className={`
                        status
                        ${getStatusClass(o.orderStatus)}
                      `}

                      title={
                        o.orderStatus === 'Rejected'
                          ? o.rejectReason ||
                            'Không có lý do'
                          : ''
                      }

                      onClick={() => {

                        if (
                          o.orderStatus === 'Rejected'
                        ) {

                          alert(
                            `Lý do từ chối:\n\n${
                              o.rejectReason ||
                              'Không có lý do'
                            }`
                          )

                        }

                      }}

                      style={{
                        cursor:
                          o.orderStatus === 'Rejected'
                            ? 'pointer'
                            : 'default'
                      }}

                    >

                      {getStatusLabel(
                        o.orderStatus
                      )}

                    </span>

                  </td>

                  <td>

                    {new Date(
                      o.createdAt
                    ).toLocaleDateString()}

                  </td>

                  <td>

                    {o.orderStatus === 'Draft' && (

                      <button
                        className="action-btn"
                        onClick={() =>
                          sendOrderToStation(o.id)
                        }
                      >
                        Gửi kế toán
                      </button>

                    )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  )
}