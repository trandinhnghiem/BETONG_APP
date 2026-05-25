import { useEffect, useState } from 'react'
import {
  FiCheckCircle,
  FiRefreshCcw
} from 'react-icons/fi'

import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

import apiClient from '../../services/api'
import './OrdersPage.css'

interface Order {
  id: number
  orderCode: string
  coordinatorName: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  createdAt: string
}

export default function StationOrdersPage() {

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  // =========================
  // FORMAT TIME (-7 HOURS)
  // =========================
  const formatDateTime = (
    dateString: string
  ) => {

    const date =
      new Date(dateString)

    // trừ 7 tiếng
    date.setHours(
      date.getHours() - 7
    )

    return date.toLocaleString(
      'vi-VN'
    )

  }

  // =========================
  // FETCH ORDERS
  // =========================
  const fetchOrders = async () => {

    try {

      setLoading(true)

      const res =
        await apiClient.get(
          '/api/orders/station-orders'
        )

      setOrders(
        res.data.map((o: any) => ({

          id: o.Id,

          orderCode:
            o.OrderCode,

          coordinatorName:
            o.CoordinatorName,

          destinationStation:
            o.DestinationStation,

          totalAmount:
            o.TotalAmount || 0,

          orderStatus:
            o.OrderStatus,

          createdAt:
            o.CreatedAt

        }))
      )

    } catch (err) {

      console.error(err)

      setOrders([])

    } finally {

      setLoading(false)

    }

  }

  // =========================
  // UPDATE STATUS
  // =========================
  const updateStatus = async (
    orderId: number,
    status: string
  ) => {

    try {

      const confirmed =
        window.confirm(
          `Xác nhận chuyển sang trạng thái "${status}" ?`
        )

      if (!confirmed) return

      await apiClient.post(
        `/api/orders/${orderId}/status`,
        { status }
      )

      await fetchOrders()

    } catch (err) {

      console.error(err)

      alert('Lỗi cập nhật')

    }

  }

  // =========================
  // STATUS LABEL
  // =========================
  const statusMap:
    Record<string, string> = {

    Draft:
      'Đơn tạm',

    'Pending Approval':
      'Chờ duyệt',

    Approved:
      'Đã duyệt',

    Processing:
      'Đang xử lý',

    Delivering:
      'Đang giao hàng',

    Completed:
      'Hoàn thành',

    Cancelled:
      'Đã hủy',

    Rejected:
      'Từ chối',

    Sent:
      'Đã gửi',

    Delivered:
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

  // =========================
  // EXPORT EXCEL
  // =========================
  const exportExcel = () => {

    const excelData =
      orders.map((order) => ({

        'Mã đơn':
          order.orderCode,

        'Điều phối':
          order.coordinatorName,

        'Tổng tiền':
          order.totalAmount,

        'Trạng thái':
          getStatusLabel(
            order.orderStatus
          ),

        'Ngày tạo':
          formatDateTime(
            order.createdAt
          )

      }))

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      )

    worksheet['!cols'] = [

      { wch: 20 },

      { wch: 25 },

      { wch: 18 },

      { wch: 20 },

      { wch: 25 }

    ]

    const workbook =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'DanhSachDonHang'
    )

    const excelBuffer =
      XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      })

    const fileData =
      new Blob(
        [excelBuffer],
        {
          type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
        }
      )

    saveAs(
      fileData,
      `don-hang-${Date.now()}.xlsx`
    )

  }

  // =========================
  // UI
  // =========================
  return (

    <div className="orders-dashboard">

      {/* HEADER */}
      <div className="page-header">

        <div>

          <h1>
            Quản lý đơn hàng
          </h1>

          <p>
            Theo dõi và cập nhật
            trạng thái đơn hàng
            của trạm
          </p>

        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px'
          }}
        >

          <button
            className="refresh-btn"
            onClick={exportExcel}
          >
            📥 Xuất Excel
          </button>

          <button
            className="refresh-btn"
            onClick={fetchOrders}
          >

            <FiRefreshCcw
              size={16}
            />

            Làm mới

          </button>

        </div>

      </div>

      {/* LOADING */}
      {loading ? (

        <div className="loading">
          Đang tải...
        </div>

      ) : (

        <div
          style={{
            width: '100%',
            overflowX: 'auto'
          }}
        >
          <table className="orders-table">

          <thead>

            <tr>

              <th>
                Mã đơn
              </th>

              <th>
                Điều phối
              </th>

              <th>
                Tiền
              </th>

              <th>
                Ngày tạo
              </th>

              <th>
                Trạng thái
              </th>

              <th>
                Hành động
              </th>

            </tr>

          </thead>

          <tbody>

            {orders.map((order) => (

              <tr key={order.id}>

                <td>
                  {order.orderCode}
                </td>

                <td>
                  {order.coordinatorName || '---'}
                </td>

                <td>
                  {order.totalAmount.toLocaleString()}
                  {' '}đ
                </td>

                <td>
                  {formatDateTime(
                    order.createdAt
                  )}
                </td>

                <td>

                  <span
                    className={`
                      status
                      ${getStatusClass(
                        order.orderStatus
                      )}
                    `}
                  >

                    {getStatusLabel(
                      order.orderStatus
                    )}

                  </span>

                </td>

                <td>

                  <div className="actions">

                    {String(
                      order.orderStatus
                    ).trim() ===
                      'Approved' && (

                      <button
                        onClick={() =>
                          updateStatus(
                            order.id,
                            'Processing'
                          )
                        }
                      >
                        ⚙️ Xử lý
                      </button>

                    )}

                    {order.orderStatus ===
                      'Processing' && (

                      <button
                        onClick={() =>
                          updateStatus(
                            order.id,
                            'Delivering'
                          )
                        }
                      >
                        🚚 Giao hàng
                      </button>

                    )}

                    {order.orderStatus ===
                      'Delivering' && (

                      <button
                        onClick={() =>
                          updateStatus(
                            order.id,
                            'Completed'
                          )
                        }
                      >

                        <FiCheckCircle
                          size={16}
                        />

                        Hoàn thành

                      </button>

                    )}

                  </div>

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