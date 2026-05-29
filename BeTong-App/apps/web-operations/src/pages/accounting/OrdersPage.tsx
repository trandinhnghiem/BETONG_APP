import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FiEdit2, FiEye, FiUpload, FiX, FiPrinter, FiAlertTriangle, FiCamera, FiTrash2, FiFile } from 'react-icons/fi'
import apiClient from '../../services/api'
import './OrdersPage.css'

// ===================== INTERFACES =====================

interface Order {
  id: number
  orderCode: string
  coordinatorName?: string
  customerName: string
  phone: string
  address: string
  destinationStation: string
  sourceStation: string
  concreteType: string
  volume: number
  price: number
  totalAmount: number
  debtAmount: number
  debtLimit: number
  deliveryTime: string
  engineer: string
  pipeHolder: string
  pipeFixer: string
  truck: string
  orderStatus: string
  paymentStatus?: string
  debtDueDate?: string | null
  createdAt: string
  additionalCosts: number
  transportCompVolume: number
  transportCompAmount: number
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
  additionalCosts: number
  transportCompVolume: number
  transportCompAmount: number
}

interface DebtWarningDetails {
  customerName: string
  currentDebt: number
  orderTotal: number
  futureDebt: number
  debtLimit: number
}

interface TransportCompResult {
  customerName: string
  deliveryDate: string
  totalVolume: number
  orderCount: number
  minVolume: number
  needsCompensation: boolean
  transportCompVolume: number
  message: string
}

type UploadModalMode = 'upload' | 'edit'
type InvoiceModalMode = 'new' | 'reprint'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// ✅ Hằng số: Đơn tối thiểu (m³)
const MIN_VOLUME = 5

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
  if (!dateString) return '—'
  const date = new Date(dateString)
  date.setHours(date.getHours() - 7)
  return date.toLocaleDateString('vi-VN')
}

const formatVNDateTime = (dateString: string) => {
  if (!dateString) return '—'
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

// ===================== INVOICE HTML BUILDER =====================
const buildInvoiceHtml = (
  order: Order,
  form: InvoiceFormData,
  paymentType?: 'full' | 'debt',
  debtDueDate?: string | null
) => {
  const volumeLabel = order.volume.toLocaleString('vi-VN')
  const priceLabel = order.price.toLocaleString('vi-VN')
  const concreteTotalLabel = (order.volume * order.price).toLocaleString('vi-VN')
  const totalLabel = order.totalAmount.toLocaleString('vi-VN')
  const invoiceDateLabel = formatVNDate(form.invoiceDate)
  const paymentStatusLabel = paymentType === 'debt' ? 'Ghi công nợ' : 'Đã thanh toán'
  const dueDateLabel = debtDueDate ? formatVNDate(debtDueDate) : ''

  const addCostsLabel = form.additionalCosts.toLocaleString('vi-VN')
  const tCompVolumeLabel = form.transportCompVolume.toLocaleString('vi-VN')
  const tCompAmountLabel = form.transportCompAmount.toLocaleString('vi-VN')

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
      .grid-3 {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
      .compensation-box {
        margin-top: 16px;
        padding: 12px 16px;
        border-radius: 10px;
        border: 2px solid #3b82f6;
        background: #eff6ff;
      }
      .compensation-box .comp-label {
        font-size: 14px;
        font-weight: 700;
        color: #1d4ed8;
      }
      .compensation-box .comp-detail {
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
          <div class="label">SĐT</div>
          <div class="value">${escapeHtml(order.phone || '—')}</div>
        </div>
        <div>
          <div class="label">Địa chỉ</div>
          <div class="value">${escapeHtml(order.address || '—')}</div>
        </div>
        <div>
          <div class="label">Trạm nhận</div>
          <div class="value">${escapeHtml(order.destinationStation || 'Không rõ')}</div>
        </div>
        <div>
          <div class="label">Loại bê tông</div>
          <div class="value">${escapeHtml(order.concreteType || '—')}</div>
        </div>
        <div>
          <div class="label">Phương thức thanh toán</div>
          <div class="value">${escapeHtml(form.paymentMethod)}</div>
        </div>
        <div>
          <div class="label">Giờ đổ</div>
          <div class="value">${order.deliveryTime ? escapeHtml(formatVNDateTime(order.deliveryTime)) : '—'}</div>
        </div>
        <div>
          <div class="label">Kỹ sư</div>
          <div class="value">${escapeHtml(order.engineer || '—')}</div>
        </div>
        <div>
          <div class="label">Vận hành bơm</div>
          <div class="value">${escapeHtml(order.pipeHolder || '—')}</div>
        </div>
        <div>
          <div class="label">Lắp ống</div>
          <div class="value">${escapeHtml(order.pipeFixer || '—')}</div>
        </div>
        <div>
          <div class="label">Xe</div>
          <div class="value">${escapeHtml(order.truck || '—')}</div>
        </div>
      </div>

      <h2 class="section-title">Chi tiết đơn hàng</h2>
      <table>
        <thead>
          <tr>
            <th>Diễn giải</th>
            <th>Khối lượng (m³)</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bê tông ${escapeHtml(order.concreteType || '')} - ${escapeHtml(order.orderCode)}</td>
            <td>${escapeHtml(volumeLabel)}</td>
            <td>${escapeHtml(priceLabel)} đ/m³</td>
            <td>${escapeHtml(concreteTotalLabel)} đ</td>
          </tr>
          ${form.additionalCosts > 0 ? `
          <tr>
            <td>Chi phí phát sinh</td>
            <td>—</td>
            <td>—</td>
            <td>${escapeHtml(addCostsLabel)} đ</td>
          </tr>
          ` : ''}
          ${form.transportCompAmount > 0 ? `
          <tr>
            <td>Bù vận chuyển (${escapeHtml(tCompVolumeLabel)} m³ x ${escapeHtml(priceLabel)} đ)</td>
            <td>${escapeHtml(tCompVolumeLabel)}</td>
            <td>${escapeHtml(priceLabel)} đ/m³</td>
            <td>${escapeHtml(tCompAmountLabel)} đ</td>
          </tr>
          ` : ''}
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

      ${form.transportCompAmount > 0 ? `
      <div class="compensation-box">
        <div class="comp-label">Bù vận chuyển</div>
        <div class="comp-detail">
          Đơn tối thiểu: ${MIN_VOLUME}m³ | Tổng KL ngày: ${escapeHtml((order.volume).toLocaleString('vi-VN'))}m³ | Thiếu: ${escapeHtml(tCompVolumeLabel)}m³
        </div>
        <div class="comp-detail">
          Phí bù = ${escapeHtml(tCompVolumeLabel)}m³ x ${escapeHtml(priceLabel)} đ/m³ = ${escapeHtml(tCompAmountLabel)} đ
        </div>
      </div>
      ` : ''}

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

// ===================== UPLOAD MODAL =====================
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

// ===================== MAIN COMPONENT =====================
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
    customerName: '',
    additionalCosts: 0,
    transportCompVolume: 0,
    transportCompAmount: 0
  })

  // ✅ State cho bù vận chuyển
  const [transportCompResult, setTransportCompResult] = useState<TransportCompResult | null>(null)
  const [calculatingComp, setCalculatingComp] = useState(false)

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
        sourceStation: o.SourceStation || '',
        concreteType: o.ConcreteType || '',
        volume: o.Volume || 0,
        price: o.Price || 0,
        totalAmount: o.TotalAmount || 0,
        debtAmount: o.DebtAmount || 0,
        debtLimit: o.DebtLimit || 0,
        deliveryTime: o.DeliveryTime || '',
        engineer: o.Engineer || '',
        pipeHolder: o.PipeHolder || '',
        pipeFixer: o.PipeFixer || '',
        truck: o.Truck || '',
        orderStatus: o.OrderStatus,
        paymentStatus: o.PaymentStatus || 'pending',
        debtDueDate: o.DebtDueDate || null,
        createdAt: o.CreatedAt,
        additionalCosts: o.AdditionalCosts || 0,
        transportCompVolume: o.TransportCompVolume || 0,
        transportCompAmount: o.TransportCompAmount || 0
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

  // ✅ Tính bù vận chuyển khi mở hóa đơn
  const calculateTransportComp = async (order: Order) => {
    if (!order.customerName || !order.deliveryTime) {
      setTransportCompResult(null)
      return
    }

    try {
      setCalculatingComp(true)
      const deliveryDate = new Date(order.deliveryTime).toISOString().slice(0, 10)
      const res = await apiClient.get('/api/orders/transport-compensation', {
        params: { customerName: order.customerName, deliveryDate }
      })
      const result = res.data as TransportCompResult
      setTransportCompResult(result)

      // Cập nhật form
      if (result.needsCompensation) {
        const compAmount = result.transportCompVolume * order.price
        setInvoiceForm(prev => ({
          ...prev,
          transportCompVolume: result.transportCompVolume,
          transportCompAmount: compAmount
        }))
      } else {
        setInvoiceForm(prev => ({
          ...prev,
          transportCompVolume: 0,
          transportCompAmount: 0
        }))
      }
    } catch (err) {
      console.error('Lỗi tính bù vận chuyển:', err)
      setTransportCompResult(null)
    } finally {
      setCalculatingComp(false)
    }
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

  // Mở modal Xuất hóa đơn (lần đầu)
  const openInvoiceModal = (order: Order) => {
    setPaymentChoice('full')
    setDebtDueDateInput('')
    setTransportCompResult(null)
    setInvoiceForm({
      invoiceNumber: `HD-${order.orderCode}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Tiền mặt',
      note: '',
      customerName: order.customerName || 'Khách hàng',
      additionalCosts: order.additionalCosts || 0,
      transportCompVolume: order.transportCompVolume || 0,
      transportCompAmount: order.transportCompAmount || 0
    })
    setInvoiceModal({ open: true, orderId: order.id, mode: 'new' })

    // ✅ Tự động tính bù vận chuyển
    calculateTransportComp(order)
  }

  // Mở modal In lại HĐ
  const openReprintModal = (order: Order) => {
    setInvoiceForm({
      invoiceNumber: `HD-${order.orderCode}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Tiền mặt',
      note: '',
      customerName: order.customerName || 'Khách hàng',
      additionalCosts: order.additionalCosts || 0,
      transportCompVolume: order.transportCompVolume || 0,
      transportCompAmount: order.transportCompAmount || 0
    })
    setInvoiceModal({ open: true, orderId: order.id, mode: 'reprint' })
  }

  const closeInvoiceModal = () => {
    setInvoiceModal({ open: false, orderId: null, mode: 'new' })
    setPaymentChoice('full')
    setDebtDueDateInput('')
    setTransportCompResult(null)
  }

  // Xử lý submit form hóa đơn
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

      // Nếu lần đầu xuất → gọi API xác nhận thanh toán (kèm chi phí phát sinh & bù VC)
      if (invoiceModal.mode === 'new') {
        await apiClient.post(`/api/orders/${order.id}/confirm-payment`, {
          paymentType: paymentChoice,
          debtDueDate: paymentChoice === 'debt' ? debtDueDateInput : undefined,
          additionalCosts: invoiceForm.additionalCosts,
          transportCompVolume: invoiceForm.transportCompVolume,
          transportCompAmount: invoiceForm.transportCompAmount
        })
      } else {
        // In lại → vẫn cập nhật chi phí nếu thay đổi
        if (
          invoiceForm.additionalCosts !== order.additionalCosts ||
          invoiceForm.transportCompVolume !== order.transportCompVolume
        ) {
          await apiClient.put(`/api/orders/${order.id}/update-costs`, {
            additionalCosts: invoiceForm.additionalCosts,
            transportCompVolume: invoiceForm.transportCompVolume,
            transportCompAmount: invoiceForm.transportCompAmount
          })
        }
      }

      // Xây dựng và in hóa đơn - sử dụng dữ liệu form đã cập nhật
      const orderForInvoice: Order = {
        ...order,
        additionalCosts: invoiceForm.additionalCosts,
        transportCompVolume: invoiceForm.transportCompVolume,
        transportCompAmount: invoiceForm.transportCompAmount,
        totalAmount: order.volume * order.price + invoiceForm.additionalCosts + invoiceForm.transportCompAmount
      }

      const currentPaymentType = invoiceModal.mode === 'new'
        ? paymentChoice
        : order.paymentStatus === 'Debt' ? 'debt' : 'full'

      const currentDueDate = invoiceModal.mode === 'new'
        ? (paymentChoice === 'debt' ? debtDueDateInput : null)
        : order.debtDueDate

      const html = buildInvoiceHtml(orderForInvoice, invoiceForm, currentPaymentType, currentDueDate)

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
                    <td title={order.address}>{order.address ? (order.address.length > 20 ? order.address.slice(0, 20) + '...' : order.address) : '—'}</td>
                    <td>{order.destinationStation}</td>
                    <td>{order.concreteType || '—'}</td>
                    <td>{order.volume ? `${order.volume} m³` : '—'}</td>
                    <td className="money">{order.price ? `${order.price.toLocaleString()} đ` : '—'}</td>
                    <td className="money">
                      {order.totalAmount.toLocaleString()} đ
                      {order.transportCompAmount > 0 && (
                        <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 2 }}>
                          +Bù VC: {order.transportCompAmount.toLocaleString()} đ
                        </div>
                      )}
                      {order.additionalCosts > 0 && (
                        <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>
                          +Phát sinh: {order.additionalCosts.toLocaleString()} đ
                        </div>
                      )}
                    </td>
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
                    <td>{order.deliveryTime ? formatVNDateTime(order.deliveryTime) : '—'}</td>
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

      {/* VIEW MODAL */}
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

      {/* ============================
          MODAL HÓA ĐƠN (GỘP THANH TOÁN + BÙ VC + CHI PHÍ PHÁT SINH)
          ============================ */}
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
              width: 'min(640px, 100%)',
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
                aria-label="Đóng popup"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* CHỌN THANH TOÁN (chỉ hiện khi mode 'new') */}
              {invoiceModal.mode === 'new' && (
                <div className="invoice-payment-section">
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#374151' }}>
                    Trạng thái thanh toán
                  </div>
                  <div className="payment-choice">
                    <div
                      className={`choice-card${paymentChoice === 'full' ? ' selected-full' : ''}`}
                      onClick={() => setPaymentChoice('full')}
                    >
                      <div className="choice-icon">💰</div>
                      <div className="choice-title">Trả hết</div>
                      <div className="choice-desc">Khách đã thanh toán toàn bộ. Xuất hóa đơn hoàn tất.</div>
                    </div>

                    <div
                      className={`choice-card${paymentChoice === 'debt' ? ' selected-debt' : ''}`}
                      onClick={() => setPaymentChoice('debt')}
                    >
                      <div className="choice-icon">📋</div>
                      <div className="choice-title">Ghi công nợ</div>
                      <div className="choice-desc">Khách chưa trả, xuất hóa đơn làm bằng chứng đòi nợ.</div>
                    </div>
                  </div>

                  {paymentChoice === 'debt' && (
                    <div className="debt-date-field">
                      <label>Hạn trả công nợ *</label>
                      <input
                        type="date"
                        value={debtDueDateInput}
                        onChange={event => setDebtDueDateInput(event.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ✅ BÙ VẬN CHUYỂN */}
              <div className="invoice-payment-section" style={{ borderColor: '#3b82f6', background: '#eff6ff' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1d4ed8' }}>
                  Bù vận chuyển (Đơn tối thiểu: {MIN_VOLUME} m³)
                </div>

                {calculatingComp ? (
                  <div style={{ color: '#6b7280', fontSize: 13 }}>Đang tính toán bù vận chuyển...</div>
                ) : transportCompResult ? (
                  <div style={{ fontSize: 13, color: '#374151' }}>
                    <div style={{ marginBottom: 6 }}>
                      <strong>Tổng KL trong ngày:</strong> {transportCompResult.totalVolume} m³ | <strong>Số đơn:</strong> {transportCompResult.orderCount}
                    </div>
                    {transportCompResult.needsCompensation ? (
                      <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                        <div><strong style={{ color: '#dc2626' }}>Cần bù vận chuyển:</strong> {transportCompResult.transportCompVolume} m³</div>
                        <div style={{ color: '#6b7280', marginTop: 4 }}>
                          Công thức: {MIN_VOLUME} - {transportCompResult.totalVolume} = {transportCompResult.transportCompVolume} m³
                        </div>
                        <div style={{ color: '#6b7280', marginTop: 2 }}>
                          Tiền bù = {transportCompResult.transportCompVolume} m³ x {orders.find(o => o.id === invoiceModal.orderId)?.price?.toLocaleString() || 0} đ/m³ = <strong style={{ color: '#dc2626' }}>{invoiceForm.transportCompAmount.toLocaleString()} đ</strong>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac', color: '#15803d' }}>
                        Tổng KL {transportCompResult.totalVolume} m³ {'>='} {MIN_VOLUME} m³ → Không cần bù vận chuyển
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#6b7280', fontSize: 13 }}>Chưa có thông tin bù vận chuyển</div>
                )}

                <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
                  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>Số khối bù VC (m³)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={invoiceForm.transportCompVolume}
                      onChange={event => {
                        const vol = Number(event.target.value) || 0
                        const order = orders.find(o => o.id === invoiceModal.orderId)
                        const price = order?.price || 0
                        setInvoiceForm(prev => ({
                          ...prev,
                          transportCompVolume: vol,
                          transportCompAmount: vol * price
                        }))
                      }}
                      style={{ padding: '6px 10px', border: '1px solid #93c5fd', borderRadius: 6, fontSize: 13 }}
                    />
                  </label>
                  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>Tiền bù VC (đ)</span>
                    <input
                      type="number"
                      min="0"
                      value={invoiceForm.transportCompAmount}
                      onChange={event => setInvoiceForm(prev => ({
                        ...prev,
                        transportCompAmount: Number(event.target.value) || 0
                      }))}
                      style={{ padding: '6px 10px', border: '1px solid #93c5fd', borderRadius: 6, fontSize: 13 }}
                    />
                  </label>
                </div>
              </div>

              {/* ✅ CHI PHÍ PHÁT SINH */}
              <div className="invoice-form-section">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#374151' }}>
                  Chi phí phát sinh
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Số tiền phát sinh (đ)</span>
                  <input
                    type="number"
                    min="0"
                    value={invoiceForm.additionalCosts}
                    onChange={event => setInvoiceForm(prev => ({
                      ...prev,
                      additionalCosts: Number(event.target.value) || 0
                    }))}
                    placeholder="0"
                  />
                </label>
              </div>

              {/* ✅ THÔNG TIN NHÂN SỰ & XE */}
              {(() => {
                const order = orders.find(o => o.id === invoiceModal.orderId)
                if (!order) return null
                return (
                  <div className="invoice-form-section" style={{ borderColor: '#8b5cf6', background: '#f5f3ff' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#6d28d9' }}>
                      Nhân sự & Xe
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>Kỹ sư</span>
                        <input
                          value={order.engineer || '—'}
                          readOnly
                          style={{ padding: '6px 10px', border: '1px solid #c4b5fd', borderRadius: 6, fontSize: 13, background: '#ede9fe', color: '#4c1d95' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>Vận hành bơm</span>
                        <input
                          value={order.pipeHolder || '—'}
                          readOnly
                          style={{ padding: '6px 10px', border: '1px solid #c4b5fd', borderRadius: 6, fontSize: 13, background: '#ede9fe', color: '#4c1d95' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>Lắp ống</span>
                        <input
                          value={order.pipeFixer || '—'}
                          readOnly
                          style={{ padding: '6px 10px', border: '1px solid #c4b5fd', borderRadius: 6, fontSize: 13, background: '#ede9fe', color: '#4c1d95' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>Xe</span>
                        <input
                          value={order.truck || '—'}
                          readOnly
                          style={{ padding: '6px 10px', border: '1px solid #c4b5fd', borderRadius: 6, fontSize: 13, background: '#ede9fe', color: '#4c1d95' }}
                        />
                      </label>
                    </div>
                  </div>
                )
              })()}

              {/* THÔNG TIN HÓA ĐƠN */}
              <div className="invoice-form-section">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#374151' }}>
                  Thông tin hóa đơn
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Số hóa đơn</span>
                  <input
                    value={invoiceForm.invoiceNumber}
                    onChange={event => setInvoiceForm(prev => ({ ...prev, invoiceNumber: event.target.value }))}
                    placeholder="VD: HD-ORD001"
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Ngày lập</span>
                  <input
                    type="date"
                    value={invoiceForm.invoiceDate}
                    onChange={event => setInvoiceForm(prev => ({ ...prev, invoiceDate: event.target.value }))}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Khách hàng</span>
                  <input
                    value={invoiceForm.customerName}
                    onChange={event => setInvoiceForm(prev => ({ ...prev, customerName: event.target.value }))}
                    placeholder="Tên khách hàng"
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Phương thức thanh toán</span>
                  <select
                    value={invoiceForm.paymentMethod}
                    onChange={event => setInvoiceForm(prev => ({ ...prev, paymentMethod: event.target.value }))}
                  >
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Thẻ">Thẻ</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Ghi chú</span>
                  <textarea
                    rows={3}
                    value={invoiceForm.note}
                    onChange={event => setInvoiceForm(prev => ({ ...prev, note: event.target.value }))}
                    placeholder="Thông tin bổ sung"
                  />
                </label>
              </div>

              {/* TỔNG CỘNG */}
              {(() => {
                const order = orders.find(o => o.id === invoiceModal.orderId)
                if (!order) return null
                const baseAmount = order.volume * order.price
                const totalWithAll = baseAmount + invoiceForm.additionalCosts + invoiceForm.transportCompAmount
                return (
                  <div style={{
                    padding: '12px 16px',
                    background: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>Tiền bê tông ({order.volume} m³ x {order.price.toLocaleString()} đ):</span>
                      <span>{baseAmount.toLocaleString()} đ</span>
                    </div>
                    {invoiceForm.additionalCosts > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span>Chi phí phát sinh:</span>
                        <span>{invoiceForm.additionalCosts.toLocaleString()} đ</span>
                      </div>
                    )}
                    {invoiceForm.transportCompAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span>Bù vận chuyển ({invoiceForm.transportCompVolume} m³):</span>
                        <span>{invoiceForm.transportCompAmount.toLocaleString()} đ</span>
                    </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, borderTop: '1px dashed #d1d5db', paddingTop: 8 }}>
                      <span>Tổng cộng:</span>
                      <span style={{ color: '#15803d' }}>{totalWithAll.toLocaleString()} đ</span>
                    </div>
                  </div>
                )
              })()}

              {/* NÚT SUBMIT */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="action-btn" onClick={closeInvoiceModal}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  disabled={confirmingPayment || (invoiceModal.mode === 'new' && paymentChoice === 'debt' && !debtDueDateInput)}
                  style={{
                    background: invoiceModal.mode === 'new'
                      ? (paymentChoice === 'debt' ? '#f59e0b' : '#10b981')
                      : '#6366f1',
                    color: 'white',
                    opacity: (invoiceModal.mode === 'new' && paymentChoice === 'debt' && !debtDueDateInput) ? 0.5 : 1
                  }}
                >
                  {confirmingPayment
                    ? 'Đang xử lý...'
                    : invoiceModal.mode === 'new'
                      ? (paymentChoice === 'debt' ? 'Ghi công nợ & Xuất HĐ' : 'Xác nhận trả hết & Xuất HĐ')
                      : 'In lại hóa đơn'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
