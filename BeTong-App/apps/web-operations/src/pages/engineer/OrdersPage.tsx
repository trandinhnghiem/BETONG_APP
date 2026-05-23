import { useEffect, useState, useRef, type ChangeEvent } from 'react'
import { FiCamera, FiDownload, FiEdit2, FiEye, FiFile, FiSave, FiTrash2, FiUpload, FiX } from 'react-icons/fi'
import apiClient from '../../services/api'
import './OrdersPage.css'
import * as ExcelJS from 'exceljs'

type UploadSource = 'camera' | 'file'
type UploadModalMode = 'upload' | 'edit'

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

interface SaveDocumentPayload {
  files: FileList
  source: UploadSource
  deleteIds: number[]
}

function UploadModal({
  open,
  onClose,
  onUpload,
  onSave,
  orderId,
  mode,
  documents,
  saving
}: {
  open: boolean
  onClose: () => void
  onUpload: (files: FileList, source: UploadSource) => void
  onSave: (payload: SaveDocumentPayload) => void
  orderId: number
  mode: UploadModalMode
  documents: OrderDocument[]
  saving: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [source, setSource] = useState<UploadSource>('file')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [deleteIds, setDeleteIds] = useState<number[]>([])

  useEffect(() => {
    if (!open) {
      setSelectedFiles([])
      setDeleteIds([])
      setSource('file')
      setCameraOpen(false)
    }
  }, [open])

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop())
    setCameraOpen(false)
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })

      setStream(mediaStream)
      setCameraOpen(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error(err)
      alert('Không mở được camera')
    }
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)

    canvas.toBlob(blob => {
      if (!blob) return

      const file = new File([blob], `camera-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      })

      setSelectedFiles([file])
      setSource('camera')
      stopCamera()
    }, 'image/jpeg')
  }

  const handleSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    setSource('file')
    setSelectedFiles(Array.from(files))
  }

  const handleDeleteToggle = (id: number) => {
    setDeleteIds(prev =>
      prev.includes(id)
        ? prev.filter(currentId => currentId !== id)
        : [...prev, id]
    )
  }

  const handleClose = () => {
    stopCamera()
    setSelectedFiles([])
    setDeleteIds([])
    onClose()
  }

  const handleSubmit = () => {
    if (mode === 'upload') {
      if (!selectedFiles.length) {
        alert('Vui lòng chọn ảnh hoặc file')
        return
      }

      const dataTransfer = new DataTransfer()
      selectedFiles.forEach(file => dataTransfer.items.add(file))
      onUpload(dataTransfer.files, source)
      return
    }

    if (!selectedFiles.length && deleteIds.length === 0) {
      alert('Không có thay đổi nào để lưu')
      return
    }

    const dataTransfer = new DataTransfer()
    selectedFiles.forEach(file => dataTransfer.items.add(file))
    onSave({
      files: dataTransfer.files,
      source,
      deleteIds
    })
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: 460,
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          maxHeight: '88vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>
              {mode === 'edit' ? 'Bổ sung chứng từ' : 'Upload chứng từ'} #{orderId}
            </h3>
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13 }}>
              {mode === 'edit' ? 'Bạn có thể xóa chứng từ hiện có, thêm mới và lưu thay đổi.' : 'Chọn ảnh hoặc file để upload chứng từ.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Đóng modal"
          >
            <FiX />
          </button>
        </div>

        {mode === 'edit' && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Danh sách chứng từ hiện có</div>

            {documents.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: 13 }}>Chưa có chứng từ nào.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {documents.map(doc => {
                  const isMarked = deleteIds.includes(doc.id)
                  return (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: 10,
                        borderRadius: 10,
                        background: isMarked ? '#fee2e2' : '#fff',
                        border: `1px solid ${isMarked ? '#fca5a5' : '#e5e7eb'}`
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{doc.originalFileName || doc.fileName}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{doc.mimeType}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteToggle(doc.id)}
                        title={isMarked ? 'Bỏ chọn xóa' : 'Xóa chứng từ'}
                        style={{
                          border: 'none',
                          background: isMarked ? '#fff' : '#ef4444',
                          color: isMarked ? '#111827' : '#fff',
                          borderRadius: 999,
                          width: 34,
                          height: 34,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="action-btn" onClick={startCamera} disabled={saving}>
            <FiCamera />
            Chụp ảnh
          </button>

          <button
            className="action-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            <FiFile />
            Tải file
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={handleSelectFile}
        />

        {cameraOpen && (
          <div style={{ marginTop: 20 }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 12 }} />
            <button className="action-btn" style={{ marginTop: 12 }} onClick={takePhoto} disabled={saving}>
              📸 Chụp
            </button>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {selectedFiles.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Tệp mới sẽ được thêm</div>
            {selectedFiles.map(file => (
              <div key={`${file.name}-${file.lastModified}`} style={{ fontSize: 13 }}>
                {file.name}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="action-btn" onClick={handleSubmit} disabled={saving}>
            {mode === 'edit' ? <FiSave style={{ marginRight: 6 }} /> : <FiUpload style={{ marginRight: 6 }} />}
            {mode === 'edit' ? 'Lưu thay đổi' : 'Upload'}
          </button>

          <button className="reset-btn" onClick={handleClose} disabled={saving}>
            Đóng
          </button>
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

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export default function EngineerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsByOrder, setDocumentsByOrder] = useState<Record<number, OrderDocument[]>>({})

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [uploadModal, setUploadModal] = useState<{ open: boolean; orderId: number | null; mode: UploadModalMode }>({ open: false, orderId: null, mode: 'upload' })
  const [viewModal, setViewModal] = useState<{ open: boolean; orderId: number | null }>({ open: false, orderId: null })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, search, status, fromDate, toDate])

  const formatVNDateTime = (dateString: string) => {
    const date = new Date(dateString)
    date.setHours(date.getHours() - 7)
    return date.toLocaleString('vi-VN')
  }

  const formatVNDate = (dateString: string) => {
    const date = new Date(dateString)
    date.setHours(date.getHours() - 7)
    return date.toLocaleDateString('vi-VN')
  }

  const getDocumentUrl = (url: string) => {
    if (!url) return '#'
    if (/^https?:\/\//i.test(url)) return url
    return `${API_BASE_URL}${url}`
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
          uploadedAt: String(record.uploadedAt ?? record.UploadedAt ?? '')
        }

        if (!normalized.url) {
          return null
        }

        return normalized
      })
      .filter((doc): doc is OrderDocument => Boolean(doc))
  }

  const fetchOrderDocuments = async (orderIds: number[]) => {
    if (!orderIds.length) return

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

      const res = await apiClient.get('/api/orders/engineer-orders')

      const data = res.data.map((o: any) => ({
        id: o.Id,
        orderCode: o.OrderCode,
        destinationStation: o.DestinationStation,
        totalAmount: o.TotalAmount || 0,
        orderStatus: o.OrderStatus,
        rejectReason: o.RejectReason,
        createdAt: o.CreatedAt
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
      result = result.filter(o => o.orderCode.toLowerCase().includes(search.toLowerCase()))
    }

    if (status !== 'All') {
      result = result.filter(o => o.orderStatus === status)
    }

    if (fromDate) {
      result = result.filter(o => new Date(o.createdAt) >= new Date(fromDate))
    }

    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      result = result.filter(o => new Date(o.createdAt) <= end)
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
    Draft: 'Đơn tạm',
    'Pending Approval': 'Chờ duyệt',
    Approved: 'Đã duyệt',
    Processing: 'Đang xử lý',
    Delivering: 'Đang giao hàng',
    Completed: 'Hoàn thành',
    Cancelled: 'Đã hủy',
    Rejected: 'Từ chối',
    Sent: 'Đã gửi',
    Delivered: 'Đã giao'
  }

  const getStatusLabel = (status: string) => statusMap[status] || status
  const getStatusClass = (status: string) => status.replace(/\s/g, '')

  const openUploadModal = (orderId: number) => {
    setUploadModal({ open: true, orderId, mode: 'upload' })
  }

  const openEditModal = (orderId: number) => {
    setUploadModal({ open: true, orderId, mode: 'edit' })
  }

  const handleUploadFiles = async (files: FileList, source: UploadSource) => {
    if (!uploadModal.orderId) return

    const formData = new FormData()
    Array.from(files).forEach(file => formData.append('files', file))
    formData.append('source', source)

    setUploading(true)

    try {
      await apiClient.post(`/api/orders/${uploadModal.orderId}/upload-documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await fetchOrderDocuments([uploadModal.orderId])
      alert('Upload thành công!')
      setUploadModal({ open: false, orderId: null, mode: 'upload' })
    } catch (err) {
      alert('Upload thất bại!')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveDocumentChanges = async ({ files, source, deleteIds }: SaveDocumentPayload) => {
    if (!uploadModal.orderId) return

    setUploading(true)

    try {
      if (deleteIds.length > 0) {
        await Promise.all(
          deleteIds.map(documentId =>
            apiClient.delete(`/api/orders/${uploadModal.orderId}/upload-documents/${documentId}`)
          )
        )
      }

      if (files.length > 0) {
        const formData = new FormData()
        Array.from(files).forEach(file => formData.append('files', file))
        formData.append('source', source)

        await apiClient.post(`/api/orders/${uploadModal.orderId}/upload-documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      await fetchOrderDocuments([uploadModal.orderId])
      alert('Lưu thay đổi thành công!')
      setUploadModal({ open: false, orderId: null, mode: 'upload' })
    } catch (err) {
      alert('Lưu thay đổi thất bại!')
    } finally {
      setUploading(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Engineer Orders')

      sheet.columns = [
        { header: 'Mã đơn', key: 'orderCode', width: 22 },
        { header: 'Trạm', key: 'destinationStation', width: 28 },
        { header: 'Tổng tiền', key: 'totalAmount', width: 20 },
        { header: 'Trạng thái', key: 'orderStatus', width: 20 },
        { header: 'Lý do từ chối', key: 'rejectReason', width: 40 },
        { header: 'Ngày tạo', key: 'createdAt', width: 25 }
      ]

      filteredOrders.forEach(order => {
        sheet.addRow({
          orderCode: order.orderCode,
          destinationStation: order.destinationStation,
          totalAmount: `${order.totalAmount.toLocaleString()} đ`,
          orderStatus: getStatusLabel(order.orderStatus),
          rejectReason: order.rejectReason || '',
          createdAt: formatVNDateTime(order.createdAt)
        })
      })

      sheet.getRow(1).font = { bold: true }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'don-hang-engineer.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Xuất Excel thất bại')
    }
  }

  return (
    <div className="orders-dashboard">
      <div className="page-header">
        <div>
          <h1>Đơn hàng của tôi</h1>
          <p>Quản lý và theo dõi trạng thái đơn hàng</p>
        </div>

        <button className="action-btn" onClick={handleExportExcel}>
          <FiDownload size={18} />
          Xuất Excel
        </button>
      </div>

      <div className="filter-bar">
        <input
          placeholder="🔍 Tìm mã đơn..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">Tất cả trạng thái</option>
          <option value="Draft">Đơn tạm</option>
          <option value="Pending Approval">Chờ duyệt</option>
          <option value="Approved">Đã duyệt</option>
          <option value="Processing">Đang xử lý</option>
          <option value="Delivering">Đang giao hàng</option>
          <option value="Completed">Hoàn thành</option>
          <option value="Cancelled">Đã hủy</option>
          <option value="Rejected">Từ chối</option>
        </select>

        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <button className="reset-btn" onClick={reset}>
          Reset
        </button>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
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
              {filteredOrders.map(order => {
                const docs = documentsByOrder[order.id] || []

                return (
                  <tr key={order.id}>
                    <td className="code">{order.orderCode}</td>
                    <td>{order.destinationStation}</td>
                    <td className="money">{order.totalAmount.toLocaleString()} đ</td>

                    <td>
                      <span
                        className={`status ${getStatusClass(order.orderStatus)}`}
                        title={order.orderStatus === 'Rejected' ? order.rejectReason || 'Không có lý do' : ''}
                        onClick={() => {
                          if (order.orderStatus === 'Rejected') {
                            alert(`Lý do từ chối:\n\n${order.rejectReason || 'Không có lý do'}`)
                          }
                        }}
                        style={{ cursor: order.orderStatus === 'Rejected' ? 'pointer' : 'default' }}
                      >
                        {getStatusLabel(order.orderStatus)}
                      </span>
                    </td>

                    <td>{formatVNDate(order.createdAt)}</td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                        {order.orderStatus === 'Completed' && (
                          docs.length === 0 ? (
                            <button className="action-btn" onClick={() => openUploadModal(order.id)} disabled={uploading}>
                              <FiUpload style={{ marginRight: 6 }} /> Upload chứng từ
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => openEditModal(order.id)}
                                disabled={uploading}
                                title="Bổ sung chứng từ"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px' }}
                              >
                                <FiEdit2 />
                              </button>

                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => setViewModal({ open: true, orderId: order.id })}
                                title="Xem chứng từ"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', gap: 6 }}
                              >
                                <FiEye />
                                <span style={{ minWidth: 20, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{docs.length}</span>
                              </button>
                            </>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <UploadModal
        open={uploadModal.open}
        onClose={() => setUploadModal({ open: false, orderId: null, mode: 'upload' })}
        onUpload={handleUploadFiles}
        onSave={handleSaveDocumentChanges}
        orderId={uploadModal.orderId || 0}
        mode={uploadModal.mode}
        documents={uploadModal.orderId ? documentsByOrder[uploadModal.orderId] || [] : []}
        saving={uploading}
      />

      {viewModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Danh sách chứng từ</h3>
                <p style={{ margin: '6px 0 0', color: '#6b7280' }}>Nhấn vào file để mở trực tiếp trên trình duyệt.</p>
              </div>

              <button
                type="button"
                onClick={() => setViewModal({ open: false, orderId: null })}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label="Đóng popup"
              >
                <FiX />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {viewModal.orderId && documentsByOrder[viewModal.orderId]?.length ? (
                documentsByOrder[viewModal.orderId].map(doc => {
                  const mimeType = doc.mimeType || 'unknown'
                  const isImage = mimeType.startsWith('image/')
                  const fullUrl = getDocumentUrl(doc.url)

                  return (
                    <a
                      key={doc.id}
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        textDecoration: 'none',
                        color: '#111827',
                        background: '#f9fafb'
                      }}
                    >
                      {isImage ? (
                        <img
                          src={fullUrl}
                          alt={doc.originalFileName || doc.fileName || 'Tệp chứng từ'}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            background: '#e0f2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0369a1',
                            fontWeight: 700
                          }}
                        >
                          {mimeType.includes('pdf') ? 'PDF' : 'FILE'}
                        </div>
                      )}

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{doc.originalFileName || doc.fileName || 'Tệp chứng từ'}</div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                          {mimeType} • {doc.uploadedAt ? formatVNDateTime(doc.uploadedAt) : 'Không rõ thời gian'}
                        </div>
                      </div>
                    </a>
                  )
                })
              ) : (
                <div style={{ padding: 16, borderRadius: 10, background: '#f9fafb', color: '#6b7280' }}>
                  Chưa có chứng từ để xem.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
