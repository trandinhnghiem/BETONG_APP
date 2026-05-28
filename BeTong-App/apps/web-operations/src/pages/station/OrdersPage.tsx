import { useEffect, useState } from 'react'
import {
  FiCheckCircle,
  FiRefreshCcw,
  FiDownload
} from 'react-icons/fi'

import * as ExcelJS from 'exceljs'

import apiClient from '../../services/api'
import './OrdersPage.css'

interface Order {

  id: number

  orderCode: string

  customerName?: string

  address?: string

  phone?: string

  concreteType?: string

  volume?: number

  price?: number

  deliveryTime?: string

  engineer?: string

  pipeHolder?: string

  pipeFixer?: string

  pouringVolume?: string

  truck?: string

  notes?: string

  coordinatorName?: string

  destinationStation?: string

  totalAmount: number

  orderStatus: string

  rejectReason?: string

  createdAt: string

}

export default function StationOrdersPage() {

  const [orders, setOrders] =
    useState<Order[]>([])

  const [loading, setLoading] =
    useState(true)

  // =========================
  // FETCH
  // =========================

  useEffect(() => {

    fetchOrders()

  }, [])

  // =========================
  // FORMAT DATE
  // =========================

  const formatDateTime = (
    dateString: string
  ) => {

    const date =
      new Date(dateString)

    date.setHours(
      date.getHours() - 7
    )

    return date.toLocaleString(
      'vi-VN'
    )

  }

  const formatDate = (
    dateString: string
  ) => {

    const date =
      new Date(dateString)

    date.setHours(
      date.getHours() - 7
    )

    return date.toLocaleDateString(
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

      console.log(
        'Station Orders:',
        res.data
      )

      const data =
        res.data.map((o: any) => ({

          id:
            o.Id,

          orderCode:
            o.OrderCode,

          customerName:
            o.CustomerName,

          address:
            o.Address,

          phone:
            o.Phone,

          concreteType:
            o.ConcreteType,

          volume:
            o.Volume,

          price:
            o.Price,

          deliveryTime:
            o.DeliveryTime,

          engineer:
            o.Engineer,

          pipeHolder:
            o.PipeHolder,

          pipeFixer:
            o.PipeFixer,

          pouringVolume:
            o.PouringVolume,

          truck:
            o.Truck,

          notes:
            o.Notes,

          coordinatorName:
            o.CoordinatorName,

          destinationStation:
            o.DestinationStation,

          totalAmount:
            o.TotalAmount || 0,

          orderStatus:
            o.OrderStatus,

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

  // =========================
  // STATUS
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

      fetchOrders()

    } catch (err) {

      console.error(err)

      alert('Lỗi cập nhật')

    }

  }

  // =========================
  // EXPORT EXCEL
  // =========================

  const exportExcel =
    async () => {

      try {

        const workbook =
          new ExcelJS.Workbook()

        const sheet =
          workbook.addWorksheet(
            'Station Orders'
          )

        sheet.columns = [

          {
            header: 'Mã đơn',
            key: 'orderCode',
            width: 22
          },

          {
            header: 'Khách hàng',
            key: 'customerName',
            width: 30
          },

          {
            header: 'SĐT',
            key: 'phone',
            width: 20
          },

          {
            header: 'Địa chỉ',
            key: 'address',
            width: 40
          },

          {
            header: 'Loại bê tông',
            key: 'concreteType',
            width: 25
          },

          {
            header: 'Khối lượng',
            key: 'volume',
            width: 15
          },

          {
            header: 'Giá',
            key: 'price',
            width: 20
          },

          {
            header: 'Giờ đổ',
            key: 'deliveryTime',
            width: 25
          },

          {
            header: 'Kỹ sư',
            key: 'engineer',
            width: 25
          },

          {
            header: 'Vận hành bơm',
            key: 'pipeHolder',
            width: 25
          },

          {
            header: 'Lắp ống',
            key: 'pipeFixer',
            width: 25
          },

          {
            header: 'HDSX',
            key: 'pouringVolume',
            width: 25
          },

          {
            header: 'Xe',
            key: 'truck',
            width: 20
          },

          {
            header: 'Ghi chú',
            key: 'notes',
            width: 40
          },

          {
            header: 'Điều phối',
            key: 'coordinatorName',
            width: 30
          },

          {
            header: 'Trạm',
            key: 'destinationStation',
            width: 25
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
            header: 'Ngày tạo',
            key: 'createdAt',
            width: 25
          }

        ]

        orders.forEach(order => {

          sheet.addRow({

            orderCode:
              order.orderCode,

            customerName:
              order.customerName || '',

            phone:
              order.phone || '',

            address:
              order.address || '',

            concreteType:
              order.concreteType || '',

            volume:
              order.volume || 0,

            price:
              order.price
                ? `${Number(
                    order.price
                  ).toLocaleString()} đ`
                : '',

            deliveryTime:
              order.deliveryTime
                ? formatDateTime(
                    order.deliveryTime
                  )
                : '',

            engineer:
              order.engineer || '',

            pipeHolder:
              order.pipeHolder || '',

            pipeFixer:
              order.pipeFixer || '',

            pouringVolume:
              order.pouringVolume || '',

            truck:
              order.truck || '',

            notes:
              order.notes || '',

            coordinatorName:
              order.coordinatorName || '',

            destinationStation:
              order.destinationStation || '',

            totalAmount:
              `${order.totalAmount.toLocaleString()} đ`,

            orderStatus:
              getStatusLabel(
                order.orderStatus
              ),

            createdAt:
              formatDateTime(
                order.createdAt
              )

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
          `station-orders-${Date.now()}.xlsx`

        document.body.appendChild(a)

        a.click()

        a.remove()

        window.URL.revokeObjectURL(
          url
        )

      } catch (err) {

        console.error(err)

        alert(
          'Xuất Excel thất bại'
        )

      }

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
            className="action-btn"
            onClick={exportExcel}
          >

            <FiDownload
              size={18}
            />

            Xuất Excel

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

        <div className="table-card">

          <div className="table-scroll">

            <table>

              <thead>

                <tr>

                  <th>Mã đơn</th>

                  <th>Khách hàng</th>

                  <th>SĐT</th>

                  <th>Địa chỉ</th>

                  <th>Loại bê tông</th>

                  <th>Khối lượng</th>

                  <th>Giá</th>

                  <th>Giờ đổ</th>

                  <th>Kỹ sư</th>

                  <th>Vận hành bơm</th>

                  <th>Lắp ống</th>

                  <th>HDSX</th>

                  <th>Xe</th>

                  <th>Ghi chú</th>

                  <th>Điều phối</th>

                  <th>Trạm</th>

                  <th>Tổng tiền</th>

                  <th>Trạng thái</th>

                  <th>Ngày tạo</th>

                  <th>Hành động</th>

                </tr>

              </thead>

              <tbody>

                {orders.map((order) => (

                  <tr key={order.id}>

                    <td className="code">
                      {order.orderCode}
                    </td>

                    <td>
                      {order.customerName || '-'}
                    </td>

                    <td>
                      {order.phone || '-'}
                    </td>

                    <td>
                      {order.address || '-'}
                    </td>

                    <td>
                      {order.concreteType || '-'}
                    </td>

                    <td>
                      {order.volume || 0}
                    </td>

                    <td className="money">

                      {order.price
                        ? `${Number(
                            order.price
                          ).toLocaleString()} đ`
                        : '-'}

                    </td>

                    <td>

                      {order.deliveryTime
                        ? formatDateTime(
                            order.deliveryTime
                          )
                        : '-'}

                    </td>

                    <td>
                      {order.engineer || '-'}
                    </td>

                    <td>
                      {order.pipeHolder || '-'}
                    </td>

                    <td>
                      {order.pipeFixer || '-'}
                    </td>

                    <td>
                      {order.pouringVolume || '-'}
                    </td>

                    <td>
                      {order.truck || '-'}
                    </td>

                    <td>
                      {order.notes || '-'}
                    </td>

                    <td>
                      {order.coordinatorName || '-'}
                    </td>

                    <td>
                      {order.destinationStation || '-'}
                    </td>

                    <td className="money">

                      {order.totalAmount.toLocaleString()} đ

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

                      {formatDate(
                        order.createdAt
                      )}

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

        </div>

      )}

    </div>

  )

}