import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FiEdit2, FiEye, FiUpload, FiX, FiPrinter, FiAlertTriangle, FiCamera, FiTrash2, FiFile } from 'react-icons/fi'
import apiClient from '../../services/api'
import './OrdersPage.css'

interface Order {
  id: number
  orderCode: string
  coordinatorName?: string
  customerName: string
  phone: string
  address: string
  destinationStation: string
  concreteType: string
  volume: number
  price: number
  totalAmount: number
  debtAmount: number
  debtLimit: number
  debtDueDate?: string | null
  deliveryTime: string | null
  engineer: string
  pipeHolder: string
  pipeFixer: string
  truck: string
  orderStatus: string
  paymentStatus?: string
  createdAt: string
}

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

interface InvoiceFormData {
  invoiceNumber: string
  invoiceDate: string
  paymentMethod: string
  note: string
  customerName: string
}

interface DebtWarningDetails {
  customerName: string
  currentDebt: number
  orderTotal: number
  futureDebt: number
  debtLimit: number
}

type UploadModalMode = 'upload' | 'edit'
type InvoiceModalMode = 'new' | 'reprint'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

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
const getStatusClass = (status: string) => status.replace(/\s+/g, '')

const formatVNDate = (dateString: string) => {
  const date = new Date(dateString)
  date.setHours(date.getHours() - 7)
  return date.toLocaleDateString('vi-VN')
}

const formatVNDateTime = (dateString: string) => {
  const date = new Date(dateString)
  date.setHours(date.getHours() - 7)
  return date.toLocaleString('vi-VN')
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildInvoiceHtml = (order: Order, form: InvoiceFormData, paymentType?: 'full' | 'debt', debtDueDate?: string | null) => {
  const totalLabel = order.totalAmount.toLocaleString('vi-VN')
  const invoiceDateLabel = formatVNDate(form.invoiceDate)
  const paymentStatusLabel = paymentType === 'debt' ? 'Ghi công nợ' : 'Đã thanh toán'
  const dueDateLabel = debtDueDate ? formatVNDate(debtDueDate) : ''

  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Hóa đơn bán hàng</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
        background: #fff;
        margin: 0;
        padding: 40px;
      }
      .invoice {
        max-width: 780px;
        margin: 0 auto;
        border: 1px solid #d1d5db;
        border-radius: 18px;
        padding: 32px;
      }
      .invoice h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        text-transform: uppercase;
      }
      .subtitle {
        color: #4b5563;
        margin-bottom: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px 24px;
        margin-bottom: 24px;
      }
      .label {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 4px;
      }
      .value {
        font-size: 15px;
        font-weight: 700;
      }
      .section-title {
        font-size: 18px;
        margin: 0 0 12px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border-bottom: 1px solid #e5e7eb;
        padding: 12px 0;
        text-align: left;
      }
      th {
        color: #6b7280;
        font-size: 13px;
      }
      .total-row td {
        border-bottom: none;
        font-size: 18px;
        font-weight: 700;
      }
      .note {
        margin-top: 28px;
        padding-top: 18px;
        border-top: 1px dashed #d1d5db;
        color: #4b5563;
      }
      .payment-status-box {
        margin-top: 20px;
        padding: 14px 18px;
        border-radius: 10px;
        border: 2px solid ${paymentType === 'debt' ? '#f59e0b' : '#10b981'};
        background: ${paymentType === 'debt' ? '#fffbeb' : '#f0fdf4'};
      }
      .payment-status-box .status-label {
        font-size: 14px;
        font-weight: 700;
        color: ${paymentType === 'debt' ? '#92400e' : '#15803d'};
      }
      .payment-status-box .status-detail {
        font-size: 13px;
        color: #4b5563;
        margin-top: 4px;
      }
      @media print {
        body { padding: 0; }
        .invoice { border: none; border-radius: 0; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="invoice">
      <h1>HÓA ĐƠN BÁN HÀNG</h1>
      <div class="subtitle">Hóa đơn được xuất từ hệ thống quản lý đơn hàng BeTong</div>

      <div class="grid">
        <div>
          <div class="label">Số hóa đơn</div>
          <div class="value">${escapeHtml(form.invoiceNumber)}</div>
        </div>
        <div>
          <div class="label">Ngày lập</div>
          <div class="value">${escapeHtml(invoiceDateLabel)}</div>
        </div>
        <div>
          <div class="label">Khách hàng</div>
          <div class="value">${escapeHtml(form.customerName || order.customerName || 'Khách hàng')}</div>
        </div>
        <div>
          <div class="label">Mã đơn hàng</div>
          <div class="value">${escapeHtml(order.orderCode)}</div>
        </div>
        <div>
          <div class="label">Trạm nhận</div>
          <div class="value">${escapeHtml(order.destinationStation || 'Không rõ')}</div>
        </div>
        <div>
          <div class="label">Phương thức thanh toán</div>
          <div class="value">${escapeHtml(form.paymentMethod)}</div>
        </div>
      </div>

      <h2 class="section-title">Thông tin thanh toán</h2>
      <table>
        <thead>
          <tr>
            <th>Diễn giải</th>
            <th>Số lượng</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(order.orderCode)}</td>
            <td>1</td>
            <td>${escapeHtml(totalLabel)} đ</td>
            <td>${escapeHtml(totalLabel)} đ</td>
          </tr>
        </tbody>
      </table>

      <table style="margin-top: 24px;">
        <tbody>
          <tr class="total-row">
            <td style="text-align: right;">Tổng cộng</td>
            <td style="text-align: right;">${escapeHtml(totalLabel)} đ</td>
          </tr>
        </tbody>
      </table>

      ${paymentType ? `
      <div class="payment-status-box">
        <div class="status-label">Trạng thái thanh toán: ${escapeHtml(paymentStatusLabel)}</div>
        ${paymentType === 'debt' && dueDateLabel ? `<div class="status-detail">Hạn trả công nợ: ${escapeHtml(dueDateLabel)}</div>` : ''}
      </div>
      ` : ''}

      <div class="note">
        <strong>Ghi chú:</strong>
        <div style="margin-top: 8px;">${escapeHtml(form.note || 'Không có ghi chú')}</div>
      </div>
    </div>
    <script>
      window.onload = function () {
  setTimeout(function () {
    window.focus()
    window.print()
  }, 500)
}
    </script>
  </body>
</html>`
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
  onUpload: (files: File[]) => void
  onSave: (payload: { files: File[]; deleteIds: number[] }) => void
  orderId: number
  mode: UploadModalMode
  documents: OrderDocument[]
  saving: boolean
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [deleteIds, setDeleteIds] = useState<number[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!open) {
      setSelectedFiles([])
      setDeleteIds([])
      setPreviews([])
      setCameraOpen(false)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  useEffect(() => {
    if (cameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
    }
  }, [cameraOpen, cameraStream])

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previews])

  const addFiles = (newFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        setPreviews(prev => [...prev, URL.createObjectURL(file)])
      }
    })
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    addFiles(Array.from(files))
    event.target.value = ''
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleDeleteToggle = (id: number) => {
    setDeleteIds(prev =>
      prev.includes(id)
        ? prev.filter(currentId => currentId !== id)
        : [...prev, id]
    )
  }

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      setCameraStream(stream)
      setCameraOpen(true)
    } catch (err) {
      console.log('Camera getUserMedia thất bại, dùng fallback input:', err)
      cameraInputRef.current?.click()
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `chup_${Date.now()}.jpg`, { type: 'image/jpeg' })
      addFiles([file])
      closeCamera()
    }, 'image/jpeg', 0.9)
  }

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
    }
    setCameraStream(null)
    setCameraOpen(false)
  }

  const handleClose = () => {
    closeCamera()
    setSelectedFiles([])
    setDeleteIds([])
    previews.forEach(url => URL.revokeObjectURL(url))
    setPreviews([])
    onClose()
  }

  const handleSubmit = () => {
    if (mode === 'upload') {
      if (!selectedFiles.length) {
        alert('Vui lòng chọn ảnh hoặc chụp ảnh')
        return
      }
      onUpload(selectedFiles)
      return
    }

    if (!selectedFiles.length && deleteIds.length === 0) {
      alert('Không có thay đổi nào để lưu')
      return
    }

    onSave({ files: selectedFiles, deleteIds })
  }

  if (!open) return null

  let previewIdx = 0

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
          width: 520,
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
              {mode === 'edit'
                ? 'Bạn có thể xóa chứng từ hiện có, thêm mới và lưu thay đổi.'
                : 'Chọn ảnh, file hoặc chụp ảnh từ camera để upload.'}
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

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>Thêm chứng từ</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <FiUpload style={{ marginRight: 6 }} />
                Chọn file
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={openCamera}
                disabled={saving}
                style={{ flex: 1, justifyContent: 'center', background: '#8b5cf6' }}
              >
                <FiCamera style={{ marginRight: 6 }} />
                Chụp ảnh
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#435ebe' }}>
                Đã chọn ({selectedFiles.length} file)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {(() => {
                  previewIdx = 0
                  return selectedFiles.map((file, index) => {
                    const isImage = file.type.startsWith('image/')
                    const previewUrl = isImage ? previews[previewIdx++] : null

                    return (
                      <div
                        key={`${file.name}-${file.size}-${index}`}
                        style={{
                          position: 'relative',
                          width: 80,
                          height: 80,
                          borderRadius: 10,
                          border: '1px solid #e5e7eb',
                          overflow: 'hidden',
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {isImage && previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={file.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', padding: 8 }}>
                            <FiFile size={24} color="#6b7280" />
                            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70 }}>
                              {file.name.length > 10 ? file.name.slice(0, 10) + '...' : file.name}
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            padding: 0
                          }}
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {mode === 'edit' && documents.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Chứng từ hiện có</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.map(doc => {
                  const checked = deleteIds.includes(doc.id)
                  const isImage = doc.mimeType?.startsWith('image/')
                  const fullUrl = getDocumentUrl(doc.url)

                  return (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: `1px solid ${checked ? '#fca5a5' : '#e5e7eb'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        background: checked ? '#fef2f2' : '#f9fafb',
                        textDecoration: checked ? 'line-through' : 'none',
                        opacity: checked ? 0.6 : 1
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleDeleteToggle(doc.id)}
                        disabled={saving}
                        style={{ accentColor: '#ef4444' }}
                      />
                      {isImage ? (
                        <img
                          src={fullUrl}
                          alt={doc.originalFileName}
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 700, fontSize: 10 }}>
                          {doc.mimeType?.includes('pdf') ? 'PDF' : 'FILE'}
                        </div>
                      )}
                      <span style={{ flex: 1, fontSize: 14 }}>{doc.originalFileName || doc.fileName}</span>
                      {checked && (
                        <FiTrash2 size={14} color="#ef4444" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" className="action-btn" onClick={handleClose} disabled={saving} style={{ background: '#6b7280' }}>
              Hủy
            </button>
            <button type="button" className="action-btn" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Đang xử lý...' : mode === 'edit' ? 'Lưu thay đổi' : 'Tải lên'}
            </button>
          </div>
        </div>
      </div>

      {cameraOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 20
          }}
        >
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
            Camera thiết bị
          </div>
          <div
            style={{
              width: 'min(640px, 95%)',
              borderRadius: 16,
              overflow: 'hidden',
              background: '#000',
              position: 'relative'
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: 'block' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="action-btn"
              onClick={closeCamera}
              style={{ background: '#6b7280', minWidth: 120, justifyContent: 'center' }}
            >
              Đóng camera
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={capturePhoto}
              style={{ background: '#10b981', minWidth: 140, justifyContent: 'center', fontWeight: 700, fontSize: 15 }}
            >
              Chụp ảnh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AccountingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>({})
  const [documentsByOrder, setDocumentsByOrder] = useState<Record<number, OrderDocument[]>>({})
  const [uploadModal, setUploadModal] = useState<{ open: boolean; orderId: number | null; mode: UploadModalMode }>({ open: false, orderId: null, mode: 'upload' })
  const [viewModal, setViewModal] = useState<{ open: boolean; orderId: number | null }>({ open: false, orderId: null })

  const [invoiceModal, setInvoiceModal] = useState<{
    open: boolean
    orderId: number | null
    mode: InvoiceModalMode
  }>({ open: false, orderId: null, mode: 'new' })

  const [paymentChoice, setPaymentChoice] = useState<'full' | 'debt'>('full')
  const [debtDueDateInput, setDebtDueDateInput] = useState('')

  const [uploading, setUploading] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Tiền mặt',
    note: '',
    customerName: ''
  })

  const [debtConfirmModal, setDebtConfirmModal] = useState<{
    open: boolean
    order: Order | null
    details: DebtWarningDetails | null
  }>({ open: false, order: null, details: null })
  const [forceApproving, setForceApproving] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

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

      const response = await apiClient.get('/api/orders/accounting-orders')
      const list = Array.isArray(response.data) ? response.data : []

      const mappedOrders: Order[] = list.map((o: any) => ({
        id: o.Id,
        orderCode: o.OrderCode,
        coordinatorName: o.CoordinatorName || '',
        customerName: o.CustomerName || '',
        phone: o.Phone || '',
        address: o.Address || '',
        destinationStation: o.DestinationStation || '',
        concreteType: o.ConcreteType || '',
        volume: o.Volume || 0,
        price: o.Price || 0,
        totalAmount: o.TotalAmount || 0,
        debtAmount: o.DebtAmount || 0,
        debtLimit: o.DebtLimit || 0,
        debtDueDate: o.DebtDueDate || null,
        deliveryTime: o.DeliveryTime || null,
        engineer: o.Engineer || '',
        pipeHolder: o.PipeHolder || '',
        pipeFixer: o.PipeFixer || '',
        truck: o.Truck || '',
        orderStatus: o.OrderStatus,
        paymentStatus: o.PaymentStatus || 'pending',
        createdAt: o.CreatedAt
      }))

      setOrders(mappedOrders)
      await fetchOrderDocuments(mappedOrders.map(order => order.id))
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đơn hàng:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const openUploadModal = (orderId: number) => {
    setUploadModal({ open: true, orderId, mode: 'upload' })
  }

  const openEditModal = (orderId: number) => {
    setUploadModal({ open: true, orderId, mode: 'edit' })
  }

  const handleAction = async (order: Order, action: string) => {
    if (!action) return

    try {
      if (action === 'approve') {
        await apiClient.post(`/api/orders/${order.id}/status`, {
          status: 'Approved'
        })
        alert('Đã phê duyệt đơn hàng')
      }

      if (action === 'reject') {
        const reason = prompt('Nhập lý do từ chối:')
        if (!reason) return

        await apiClient.post(`/api/orders/${order.id}/status`, {
          status: 'Rejected',
          reason
        })
        alert('Đã từ chối đơn hàng')
      }

      setSelectedActions(prev => ({
        ...prev,
        [order.id]: ''
      }))
      await fetchOrders()
    } catch (err: any) {
      console.error(err.response?.data || err)

      if (err.response?.status === 409 && err.response?.data?.debtWarning) {
        setDebtConfirmModal({
          open: true,
          order,
          details: err.response.data.details
        })
        return
      }

      alert(err.response?.data?.error || 'Thao tác thất bại')
    }
  }

  const handleForceApprove = async () => {
    if (!debtConfirmModal.order) return

    try {
      setForceApproving(true)

      await apiClient.post(`/api/orders/${debtConfirmModal.order.id}/status`, {
        status: 'Approved',
        forceApprove: true
      })

      alert('Đã phê duyệt đơn hàng (bất chấp vượt công nợ)')
      setDebtConfirmModal({ open: false, order: null, details: null })
      setSelectedActions(prev => ({
        ...prev,
        [debtConfirmModal.order!.id]: ''
      }))
      await fetchOrders()
    } catch (err: any) {
      console.error(err.response?.data || err)
      alert(err.response?.data?.error || 'Thao tác thất bại')
    } finally {
      setForceApproving(false)
    }
  }

  const openInvoiceModal = (order: Order) => {
    setPaymentChoice('full')
    setDebtDueDateInput('')
    setInvoiceForm({
      invoiceNumber: `HD-${order.orderCode}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Tiền mặt',
      note: '',
      customerName: order.customerName || 'Khách hàng'
    })
    setInvoiceModal({ open: true, orderId: order.id, mode: 'new' })
  }

  const openReprintModal = (order: Order) => {
    setInvoiceForm({
      invoiceNumber: `HD-${order.orderCode}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Tiền mặt',
      note: '',
      customerName: order.customerName || 'Khách hàng'
    })
    setInvoiceModal({ open: true, orderId: order.id, mode: 'reprint' })
  }

  const closeInvoiceModal = () => {
    setInvoiceModal({ open: false, orderId: null, mode: 'new' })
    setPaymentChoice('full')
    setDebtDueDateInput('')
  }

  const handleInvoiceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!invoiceModal.orderId) return

    const order = orders.find(o => o.id === invoiceModal.orderId)
    if (!order) return

    if (!invoiceForm.invoiceNumber.trim() || !invoiceForm.invoiceDate.trim()) {
      alert('Vui lòng nhập số hóa đơn và ngày lập hóa đơn')
      return
    }

    if (invoiceModal.mode === 'new' && paymentChoice === 'debt' && !debtDueDateInput) {
      alert('Vui lòng nhập hạn trả công nợ')
      return
    }

    try {
      setConfirmingPayment(true)

      if (invoiceModal.mode === 'new') {
        await apiClient.post(`/api/orders/${order.id}/confirm-payment`, {
          paymentType: paymentChoice,
          debtDueDate: paymentChoice === 'debt' ? debtDueDateInput : undefined
        })
      }

      const currentPaymentType = invoiceModal.mode === 'new'
        ? paymentChoice
        : order.paymentStatus === 'Debt' ? 'debt' : 'full'

      const currentDueDate = invoiceModal.mode === 'new'
        ? (paymentChoice === 'debt' ? debtDueDateInput : null)
        : order.debtDueDate

      const html = buildInvoiceHtml(order, invoiceForm, currentPaymentType, currentDueDate)

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')

      if (!printWindow) {
        alert('Trình duyệt đang chặn popup. Hãy cho phép popup.')
        return
      }

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 10000)

      await fetchOrders()
      closeInvoiceModal()

      if (invoiceModal.mode === 'new') {
        alert(paymentChoice === 'debt' ? 'Đã ghi công nợ và xuất hóa đơn!' : 'Đã xác nhận thanh toán và xuất hóa đơn!')
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.error || 'Thao tác thất bại')
    } finally {
      setConfirmingPayment(false)
    }
  }

  const handlePayDebt = async (order: Order) => {
    if (!confirm(`Xác nhận thanh toán công nợ cho đơn ${order.orderCode}?`)) return

    try {
      setConfirmingPayment(true)

      await apiClient.post(`/api/orders/${order.id}/confirm-debt-payment`)

      alert('Đã thanh toán công nợ!')
      await fetchOrders()
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.error || 'Thanh toán công nợ thất bại')
    } finally {
      setConfirmingPayment(false)
    }
  }

  const handleUploadFiles = async (files: File[]) => {
    if (!uploadModal.orderId) return

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

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

  const handleSaveDocumentChanges = async ({ files, deleteIds }: { files: File[]; deleteIds: number[] }) => {
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
        files.forEach(file => formData.append('files', file))

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

  const isDebtOverdue = (order: Order): boolean => {
    if (order.paymentStatus !== 'Debt' || !order.debtDueDate) return false
    const dueDate = new Date(order.debtDueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return today > dueDate
  }

  const getDaysOverdue = (order: Order): number => {
    if (!order.debtDueDate) return 0
    const dueDate = new Date(order.debtDueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    const diff = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  // Helper format DeliveryTime
  const formatDeliveryTime = (dt: string | null) => {
    if (!dt) return '—'
    try {
      return formatVNDateTime(dt)
    } catch {
      return dt
    }
  }

  return (
    <div className="orders-dashboard">
      <div className="page-header">
        <div>
          <h1>Đơn hàng - Kế toán</h1>
          <p>Danh sách đơn hàng, phê duyệt, chứng từ và xác nhận thanh toán</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : orders.length === 0 ? (
        <div className="empty">Không có đơn hàng</div>
      ) : (
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Điều phối</th>
                <th>Khách hàng</th>
                <th>SĐT</th>
                <th>Địa chỉ</th>
                <th>Trạm nhận</th>
                <th>Loại bê tông</th>
                <th>Khối lượng</th>
                <th>Giá</th>
                <th>Tổng tiền</th>
                <th>Công nợ</th>
                <th>Hạn trả</th>
                <th>Giờ đổ</th>
                <th>Kỹ sư</th>
                <th>Vận hành bơm</th>
                <th>Lắp ống</th>
                <th>Xe</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {orders.map(order => {
                const docs = documentsByOrder[order.id] || []
                const isCompleted = order.orderStatus === 'Completed'
                const isPaid = order.paymentStatus === 'Paid'
                const isDebt = order.paymentStatus === 'Debt'
                const isOverdue = isDebtOverdue(order)
                const daysOverdue = getDaysOverdue(order)

                return (
                  <tr key={order.id}>
                    <td className="code">{order.orderCode}</td>
                    <td>{order.coordinatorName}</td>
                    <td>{order.customerName}</td>
                    <td>{order.phone || '—'}</td>
                    <td>{order.address || '—'}</td>
                    <td>{order.destinationStation}</td>
                    <td>{order.concreteType || '—'}</td>
                    <td>{order.volume ? `${order.volume} m³` : '—'}</td>
                    <td className="money">{order.price ? `${order.price.toLocaleString()} đ` : '—'}</td>
                    <td className="money">{order.totalAmount.toLocaleString()} đ</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <strong>{order.debtAmount.toLocaleString()} đ</strong>
                        <span style={{ fontSize: 12, color: '#666' }}>
                          Hạn mức: {order.debtLimit.toLocaleString()} đ
                        </span>
                        {order.debtAmount + order.totalAmount > order.debtLimit && (
                          <span style={{ color: 'red', fontSize: 12, fontWeight: 600 }}>
                            Vượt hạn mức
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Cột Hạn trả */}
                    <td>
                      {isDebt && order.debtDueDate ? (
                        <div className="debt-due-date">
                          <span className={`due-date-value${isOverdue ? ' due-date-overdue' : ''}`}>
                            {isOverdue ? (
                              <>
                                <span style={{ textDecoration: 'line-through' }}>
                                  {formatVNDate(order.debtDueDate)}
                                </span>
                                <br />
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                  Trễ {daysOverdue} ngày
                                </span>
                              </>
                            ) : (
                              formatVNDate(order.debtDueDate)
                            )}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>—</span>
                      )}
                    </td>
                    <td>{formatDeliveryTime(order.deliveryTime)}</td>
                    <td>{order.engineer || '—'}</td>
                    <td>{order.pipeHolder || '—'}</td>
                    <td>{order.pipeFixer || '—'}</td>
                    <td>{order.truck || '—'}</td>
                    <td>
                      <span className={`status ${getStatusClass(order.orderStatus)}`}>
                        {getStatusLabel(order.orderStatus)}
                      </span>
                    </td>
                    <td>{formatVNDate(order.createdAt)}</td>
                    <td>
                      {order.orderStatus === 'Pending Approval' ? (
                        <div className="action-group">
                          <select
                            className="action-select"
                            value={selectedActions[order.id] || ''}
                            onChange={(event) =>
                              setSelectedActions(prev => ({
                                ...prev,
                                [order.id]: event.target.value
                              }))
                            }
                          >
                            <option value="">-- Chọn --</option>
                            <option value="approve">Phê duyệt</option>
                            <option value="reject">Từ chối</option>
                          </select>
                          <button
                            className="action-confirm"
                            onClick={() => handleAction(order, selectedActions[order.id] || '')}
                            disabled={!selectedActions[order.id]}
                          >
                            Xác nhận
                          </button>
                        </div>
                      ) : isCompleted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
                          {docs.length === 0 ? (
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
                              >
                                <FiEdit2 />
                              </button>

                              <button
                                type="button"
                                className="action-btn view"
                                onClick={() => setViewModal({ open: true, orderId: order.id })}
                                title="Xem chứng từ"
                              >
                                <FiEye />
                                <span style={{ minWidth: 20, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{docs.length}</span>
                              </button>

                              {isPaid ? (
                                <>
                                  <span className="status-badge green">Đã thanh toán</span>
                                  <button
                                    type="button"
                                    className="action-btn reprint"
                                    onClick={() => openReprintModal(order)}
                                    disabled={confirmingPayment}
                                    title="In lại hóa đơn"
                                  >
                                    <FiPrinter style={{ marginRight: 4 }} /> In lại HĐ
                                  </button>
                                </>
                              ) : isDebt ? (
                                <>
                                  {isOverdue ? (
                                    <span className="status-badge overdue">Quá hạn</span>
                                  ) : (
                                    <span className="status-badge debt">Ghi công nợ</span>
                                  )}
                                  <button
                                    type="button"
                                    className="action-btn reprint"
                                    onClick={() => openReprintModal(order)}
                                    disabled={confirmingPayment}
                                    title="In lại hóa đơn"
                                  >
                                    <FiPrinter style={{ marginRight: 4 }} /> In lại HĐ
                                  </button>
                                  <button
                                    type="button"
                                    className={`action-btn debt-pay${isOverdue ? ' overdue' : ''}`}
                                    onClick={() => handlePayDebt(order)}
                                    disabled={confirmingPayment}
                                    title="Thanh toán công nợ"
                                  >
                                    Thanh toán công nợ
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="action-btn approve"
                                  onClick={() => openInvoiceModal(order)}
                                  disabled={confirmingPayment}
                                >
                                  Xuất hóa đơn
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>--</span>
                      )}
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

      {/* VIEW MODAL: Xem chứng từ */}
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
                        background: '#f9fafb',
                        transition: 'all 0.2s'
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
                            fontWeight: 700,
                            fontSize: 14
                          }}
                        >
                          {mimeType.includes('pdf') ? 'PDF' : 'FILE'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.originalFileName || doc.fileName}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                          {mimeType} • {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}
                          {doc.uploadedAt ? ` • ${formatVNDateTime(doc.uploadedAt)}` : ''}
                        </div>
                      </div>
                      <FiEye size={18} color="#6b7280" />
                    </a>
                  )
                })
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                  Không có chứng từ nào
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN DUYỆT BẤT CHẤP VƯỢT CÔNG NỢ */}
      {debtConfirmModal.open && debtConfirmModal.details && debtConfirmModal.order && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              background: '#fff',
              borderRadius: 16,
              padding: 0,
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.3)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 14
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FiAlertTriangle size={26} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 }}>
                  Cảnh báo vượt hạn mức công nợ
                </h3>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                  Khách hàng đang có công nợ vượt hạn mức. Bạn có chắc muốn duyệt đơn này?
                </p>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#92400e' }}>
                  Thông tin công nợ: {debtConfirmModal.details.customerName}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: '#6b7280' }}>Nợ hiện tại:</span>
                    <span style={{ fontWeight: 600 }}>{debtConfirmModal.details.currentDebt.toLocaleString()} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: '#6b7280' }}>Tiền đơn hàng:</span>
                    <span style={{ fontWeight: 600 }}>+ {debtConfirmModal.details.orderTotal.toLocaleString()} đ</span>
                  </div>
                  <div style={{ borderTop: '1px dashed #d1d5db', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: '#6b7280' }}>Tổng nợ sau khi duyệt:</span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>{debtConfirmModal.details.futureDebt.toLocaleString()} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: '#6b7280' }}>Hạn mức công nợ:</span>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>{debtConfirmModal.details.debtLimit.toLocaleString()} đ</span>
                  </div>
                  <div style={{
                    marginTop: 4,
                    padding: '8px 12px',
                    background: '#fef2f2',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14
                  }}>
                    <span style={{ color: '#991b1b', fontWeight: 600 }}>Vượt hạn mức:</span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>
                      + {(debtConfirmModal.details.futureDebt - debtConfirmModal.details.debtLimit).toLocaleString()} đ
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 13,
                color: '#0369a1',
                lineHeight: 1.5
              }}>
                <strong>Lưu ý:</strong> Nếu đây là khách hàng quen, lâu năm và bạn chắc chắn muốn duyệt đơn này,
                hãy nhấn "Vẫn duyệt". Hệ thống sẽ ghi nhận việc duyệt bất chấp vượt công nợ.
                Nếu không chắc chắn, hãy nhấn "Hủy" để xem xét thêm.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setDebtConfirmModal({ open: false, order: null, details: null })}
                  disabled={forceApproving}
                  style={{ minWidth: 100 }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={handleForceApprove}
                  disabled={forceApproving}
                  style={{
                    minWidth: 140,
                    background: '#f59e0b',
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  {forceApproving ? 'Đang xử lý...' : 'Vẫn duyệt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MODAL HÓA ĐƠN (GỘP THANH TOÁN) */}
      {invoiceModal.open && (
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
            className="invoice-modal"
            style={{
              width: 'min(600px, 100%)',
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  {invoiceModal.mode === 'new' ? 'Xuất hóa đơn' : 'In lại hóa đơn'}
                </h3>
                <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13 }}>
                  {invoiceModal.mode === 'new'
                    ? <>Chọn trạng thái thanh toán và điền thông tin hóa đơn cho đơn <strong>{orders.find(o => o.id === invoiceModal.orderId)?.orderCode}</strong>.</>
                    : <>Điền thông tin hóa đơn để in lại cho đơn <strong>{orders.find(o => o.id === invoiceModal.orderId)?.orderCode}</strong>.</>
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={closeInvoiceModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FiX />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleInvoiceSubmit}>
              {/* Chọn thanh toán (chỉ hiện lần đầu) */}
              {invoiceModal.mode === 'new' && (
                <div className="invoice-payment-section">
                  <label style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, display: 'block' }}>
                    Chọn trạng thái thanh toán
                  </label>
                  <div className="payment-choice">
                    <div
                      className={`choice-card${paymentChoice === 'full' ? ' selected-full' : ''}`}
                      onClick={() => setPaymentChoice('full')}
                    >
                      <div className="choice-icon">💰</div>
                      <div className="choice-title">Trả hết</div>
                      <div className="choice-desc">Khách thanh toán toàn bộ</div>
                    </div>
                    <div
                      className={`choice-card${paymentChoice === 'debt' ? ' selected-debt' : ''}`}
                      onClick={() => setPaymentChoice('debt')}
                    >
                      <div className="choice-icon">📋</div>
                      <div className="choice-title">Ghi công nợ</div>
                      <div className="choice-desc">Ghi nhận công nợ, chọn hạn trả</div>
                    </div>
                  </div>

                  {paymentChoice === 'debt' && (
                    <div className="debt-date-field">
                      <label>Hạn trả công nợ</label>
                      <input
                        type="date"
                        value={debtDueDateInput}
                        onChange={(e) => setDebtDueDateInput(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Form Hóa đơn */}
              <div className="invoice-form-section" style={{ marginTop: 14 }}>
                <label style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Thông tin hóa đơn</label>
                <input
                  type="text"
                  placeholder="Số hóa đơn"
                  value={invoiceForm.invoiceNumber}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  required
                />
                <input
                  type="date"
                  value={invoiceForm.invoiceDate}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  required
                />
                <input
                  type="text"
                  placeholder="Khách hàng"
                  value={invoiceForm.customerName}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerName: e.target.value }))}
                />
                <select
                  value={invoiceForm.paymentMethod}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                  <option value="Khác">Khác</option>
                </select>
                <textarea
                  placeholder="Ghi chú"
                  value={invoiceForm.note}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, note: e.target.value }))}
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="action-btn"
                  onClick={closeInvoiceModal}
                  disabled={confirmingPayment}
                  style={{ background: '#6b7280' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  disabled={confirmingPayment}
                  style={{ minWidth: 160 }}
                >
                  {confirmingPayment
                    ? 'Đang xử lý...'
                    : invoiceModal.mode === 'new'
                      ? 'Xác nhận & In hóa đơn'
                      : 'In hóa đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
