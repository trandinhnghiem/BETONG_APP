import { useEffect, useState, useRef, type ChangeEvent } from 'react'
import { FiDownload, FiUpload, FiCamera, FiFile } from 'react-icons/fi'
import apiClient from '../../services/api'
import './OrdersPage.css'
import * as ExcelJS from 'exceljs'

type UploadSource = 'camera' | 'file'

interface OrderDocument {
  id: number
  orderId: number
  fileName: string
  originalFileName: string
  mimeType: string
  fileSize: number
  url: string
  path: string
  uploadedAt: string
}

function UploadModal({ open, onClose, onUpload, orderId }: { open: boolean, onClose: () => void, onUpload: (files: FileList, source: UploadSource) => void, orderId: number }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [source, setSource] = useState<UploadSource>('file')

  const handleSelect = (event: ChangeEvent<HTMLInputElement>, nextSource: UploadSource) => {
    const files = event.target.files

    if (!files || files.length === 0) {
      return
    }

    setSource(nextSource)
    setSelectedFiles(Array.from(files))
  }

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      alert('Vui lòng chọn file hoặc ảnh để upload')
      return
    }

    const dataTransfer = new DataTransfer()

    selectedFiles.forEach(file => dataTransfer.items.add(file))

    onUpload(dataTransfer.files, source)
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginTop: 0 }}>Upload chứng từ cho đơn #{orderId}</h3>
        <p style={{ color: '#555', marginBottom: 12 }}>Chọn cách upload: chụp ảnh trực tiếp hoặc tải file từ thiết bị.</p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            className="action-btn"
            onClick={() => cameraInputRef.current?.click()}
            type="button"
          >
            <FiCamera style={{ marginRight: 6 }} /> Chụp ảnh
          </button>
          <button
            className="action-btn"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <FiFile style={{ marginRight: 6 }} /> Tải file
          </button>
        </div>

        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          multiple
          style={{ display: 'none' }}
          onChange={(event) => handleSelect(event, 'camera')}
        />

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(event) => handleSelect(event, 'file')}
        />

        {selectedFiles.length > 0 ? (
          <div style={{ marginTop: 12, border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#f9fafb' }}>
            <strong>Đã chọn {selectedFiles.length} file</strong>
            <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
              {selectedFiles.map((file) => (
                <li key={`${file.name}-${file.size}`} style={{ marginBottom: 4 }}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p style={{ color: '#6b7280', marginTop: 12 }}>Chưa chọn chứng từ nào.</p>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            className="action-btn"
            onClick={handleSubmit}
          >
            <FiUpload style={{ marginRight: 6 }} /> Upload
          </button>
          <button className="reset-btn" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

interface Order {
  id: number
  orderCode: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  rejectReason?: string
  createdAt: string
}

export default function EngineerOrdersPage() {

  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsByOrder, setDocumentsByOrder] = useState<Record<number, OrderDocument[]>>({})

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

  // =========================
  // FIX TIME -7 HOURS
  // =========================
  const formatVNDateTime = (
    dateString: string
  ) => {

    const date = new Date(dateString)

    // trừ 7 tiếng
    date.setHours(
      date.getHours() - 7
    )

    return date.toLocaleString('vi-VN')

  }

  const formatVNDate = (
    dateString: string
  ) => {

    const date = new Date(dateString)

    // trừ 7 tiếng
    date.setHours(
      date.getHours() - 7
    )

    return date.toLocaleDateString('vi-VN')

  }

  const normalizeDocuments = (documents: unknown): OrderDocument[] => {
    if (!Array.isArray(documents)) {
      return []
    }

    return documents
      .map((doc) => {
        if (!doc || typeof doc !== 'object') {
          return null
        }

        const record = doc as Record<string, unknown>
        const normalized = {
          id: Number(record.id ?? record.Id ?? 0),
          orderId: Number(record.orderId ?? record.OrderId ?? 0),
          fileName: String(record.fileName ?? record.FileName ?? ''),
          originalFileName: String(record.originalFileName ?? record.OriginalFileName ?? record.originalName ?? ''),
          mimeType: String(record.mimeType ?? record.MimeType ?? ''),
          fileSize: Number(record.fileSize ?? record.FileSize ?? 0),
          url: String(record.url ?? record.Url ?? ''),
          path: String(record.path ?? record.Path ?? ''),
          uploadedAt: String(record.uploadedAt ?? record.UploadedAt ?? ''),
        }

        if (!normalized.url) {
          return null
        }

        return normalized
      })
      .filter((doc): doc is OrderDocument => Boolean(doc))
  }

  const fetchOrderDocuments = async (orderIds: number[]) => {
    if (!orderIds.length) {
      return
    }

    try {
      const entries = await Promise.all(
        orderIds.map(async (orderId) => {
          const res = await apiClient.get(`/api/orders/${orderId}/upload-documents`)
          return [orderId, normalizeDocuments(res.data)] as const
        })
      )

      setDocumentsByOrder(prev => {
        const next = { ...prev }

        entries.forEach(([orderId, documents]) => {
          next[orderId] = documents
        })

        return next
      })
    } catch (err) {
      console.error('Failed to fetch uploaded documents', err)
    }
  }

  const fetchOrders = async () => {

    try {

      setLoading(true)

      const res =
        await apiClient.get('/api/orders/engineer-orders')

      const data = res.data.map((o: any) => ({

        id: o.Id,

        orderCode: o.OrderCode,

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
      await fetchOrderDocuments(data.map((order: Order) => order.id))

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


  // Upload chứng từ modal state
  const [uploadModal, setUploadModal] = useState<{ open: boolean, orderId: number | null }>({ open: false, orderId: null })
  const [uploading, setUploading] = useState(false)

  const handleUploadFiles = async (files: FileList, source: UploadSource) => {
    if (!uploadModal.orderId) return

    const formData = new FormData()

    Array.from(files).forEach((file) => {
      formData.append('files', file)
    })

    formData.append('source', source)

    setUploading(true)
    try {
      await apiClient.post(`/api/orders/${uploadModal.orderId}/upload-documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await fetchOrderDocuments([uploadModal.orderId])
      alert('Upload thành công!')
      setUploadModal({ open: false, orderId: null })
    } catch (err) {
      alert('Upload thất bại!')
    } finally {
      setUploading(false)
    }
  }

  // =========================
  // EXPORT EXCEL
  // =========================
  const handleExportExcel = async () => {

    try {

      const workbook =
        new ExcelJS.Workbook()

      const sheet =
        workbook.addWorksheet(
          'Engineer Orders'
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
            formatVNDateTime(
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
        'don-hang-engineer.xlsx'

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

                  {/* STATUS */}
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

                    {formatVNDate(
                      o.createdAt
                    )}

                  </td>


                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {o.orderStatus === 'Completed' && (
                        <button
                          className="action-btn"
                          onClick={() => setUploadModal({ open: true, orderId: o.id })}
                          disabled={uploading}
                        >
                          <FiUpload style={{ marginRight: 6 }} /> Upload chứng từ
                        </button>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {documentsByOrder[o.id]?.length ? (
                          documentsByOrder[o.id].map((doc) => {
                            const mimeType = doc?.mimeType || ''
                            const isImage = mimeType.startsWith('image/')

                            return (
                              <div
                                key={doc.id}
                                style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, background: '#f9fafb' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  {isImage && (
                                    <img
                                      src={doc.url}
                                      alt={doc.originalFileName || doc.fileName || 'upload'}
                                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }}
                                    />
                                  )}
                                  <div>
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: '#1677ff', fontWeight: 600, textDecoration: 'none' }}
                                    >
                                      {doc.originalFileName || doc.fileName || 'Tệp chứng từ'}
                                    </a>
                                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                                      {mimeType || 'unknown'} • {doc.uploadedAt ? formatVNDateTime(doc.uploadedAt) : 'Không rõ thời gian'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: 13 }}>Chưa có chứng từ</span>
                        )}
                      </div>
                    </div>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

      <UploadModal
        open={uploadModal.open}
        onClose={() => setUploadModal({ open: false, orderId: null })}
        onUpload={handleUploadFiles}
        orderId={uploadModal.orderId || 0}
      />
    </div>
  )
}