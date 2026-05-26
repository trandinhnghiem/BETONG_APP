import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FiEdit2, FiEye, FiUpload, FiX, FiPrinter } from 'react-icons/fi'
import apiClient from '../../services/api'
import './OrdersPage.css'

interface Order {
  id: number
  orderCode: string
  destinationStation: string
  totalAmount: number
  orderStatus: string
  createdAt: string
  coordinatorName?: string
  customerName: string
  debtAmount: number
  debtLimit: number
  paymentStatus?: string
  debtDueDate?: string | null
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setSelectedFiles([])
      setDeleteIds([])
    }
  }, [open])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

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
              {mode === 'edit'
                ? 'Bạn có thể xóa chứng từ hiện có, thêm mới và lưu thay đổi.'
                : 'Chọn ảnh hoặc file để upload chứng từ.'}
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
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>Chọn file</label>
            <button
              type="button"
              className="action-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <FiUpload style={{ marginRight: 6 }} />
              Chọn ảnh / PDF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {selectedFiles.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 13, color: '#4b5563' }}>
                {selectedFiles.map(file => (
                  <div key={`${file.name}-${file.size}`}>{file.name}</div>
                ))}
              </div>
            )}
          </div>

          {mode === 'edit' && documents.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Chứng từ hiện có</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.map(doc => {
                  const checked = deleteIds.includes(doc.id)
                  return (
                    <label
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        padding: '10px 12px',
                        background: '#f9fafb'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleDeleteToggle(doc.id)}
                        disabled={saving}
                      />
                      <span style={{ flex: 1, fontSize: 14 }}>{doc.originalFileName || doc.fileName}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" className="action-btn" onClick={handleClose} disabled={saving}>
              Hủy
            </button>
            <button type="button" className="action-btn" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Đang xử lý...' : mode === 'edit' ? 'Lưu thay đổi' : 'Tải lên'}
            </button>
          </div>
        </div>
      </div>
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

  // Hóa đơn + Thanh toán gộp chung 1 modal
  // mode 'new' = lần đầu xuất (chọn trả hết/ghi nợ + điền form HĐ)
  // mode 'reprint' = in lại (chỉ điền form HĐ, không chọn thanh toán)
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
        destinationStation: o.DestinationStation || '',
        totalAmount: o.TotalAmount || 0,
        orderStatus: o.OrderStatus,
        createdAt: o.CreatedAt,
        customerName: o.CustomerName || '',
        debtAmount: o.DebtAmount || 0,
        debtLimit: o.DebtLimit || 0,
        coordinatorName: o.CoordinatorName || '',
        paymentStatus: o.PaymentStatus || 'pending',
        debtDueDate: o.DebtDueDate || null
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
      alert(err.response?.data?.error || 'Thao tác thất bại')
    }
  }

  // Mở modal Xuất hóa đơn (lần đầu - kèm chọn thanh toán)
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

  // Mở modal In lại HĐ (đã xuất trước đó, chỉ in lại)
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

  // Đóng modal hóa đơn
  const closeInvoiceModal = () => {
    setInvoiceModal({ open: false, orderId: null, mode: 'new' })
    setPaymentChoice('full')
    setDebtDueDateInput('')
  }

  // Xử lý submit form hóa đơn (gộp cả xác nhận thanh toán nếu là lần đầu)
  const handleInvoiceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!invoiceModal.orderId) return

    const order = orders.find(o => o.id === invoiceModal.orderId)
    if (!order) return

    if (!invoiceForm.invoiceNumber.trim() || !invoiceForm.invoiceDate.trim()) {
      alert('Vui lòng nhập số hóa đơn và ngày lập hóa đơn')
      return
    }

    // Nếu là lần đầu xuất → validate chọn thanh toán
    if (invoiceModal.mode === 'new' && paymentChoice === 'debt' && !debtDueDateInput) {
      alert('Vui lòng nhập hạn trả công nợ')
      return
    }

    try {
      setConfirmingPayment(true)

      // Nếu lần đầu xuất → gọi API xác nhận thanh toán
      if (invoiceModal.mode === 'new') {
        await apiClient.post(`/api/orders/${order.id}/confirm-payment`, {
          paymentType: paymentChoice,
          debtDueDate: paymentChoice === 'debt' ? debtDueDateInput : undefined
        })
      }

      // Xây dựng và in hóa đơn
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

      // Refresh danh sách đơn
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

  // Thanh toán công nợ (khi khách trả nợ)
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

  // Kiểm tra đơn công nợ có quá hạn không
  const isDebtOverdue = (order: Order): boolean => {
    if (order.paymentStatus !== 'Debt' || !order.debtDueDate) return false
    const dueDate = new Date(order.debtDueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return today > dueDate
  }

  // Tính số ngày trễ hạn
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
                <th>Trạm nhận</th>
                <th>Công nợ</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Hạn trả</th>
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
                    <td>{order.destinationStation}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <strong>{order.debtAmount.toLocaleString()} đ</strong>
                        <span style={{ fontSize: 12, color: '#666' }}>
                          Hạn mức: {order.debtLimit.toLocaleString()} đ
                        </span>
                        {order.debtAmount + order.totalAmount > order.debtLimit && (
                          <span style={{ color: 'red', fontSize: 12, fontWeight: 600 }}>
                            ⚠️ Vượt hạn mức
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="money">{order.totalAmount.toLocaleString()} đ</td>
                    <td>
                      <span className={`status ${getStatusClass(order.orderStatus)}`}>
                        {getStatusLabel(order.orderStatus)}
                      </span>
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
                                  ⚠️ Trễ {daysOverdue} ngày
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {docs.length === 0 ? (
                            <button className="action-btn" onClick={() => openUploadModal(order.id)} disabled={uploading}>
                              <FiUpload style={{ marginRight: 6 }} /> Upload chứng từ
                            </button>
                          ) : (
                            <>
                              {/* Nút chứng từ - luôn hiện khi có docs */}
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
                                /* ĐÃ THANH TOÁN → Badge + In lại HĐ */
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
                                /* GHI CÔNG NỢ / QUÁ HẠN → Badge + In lại HĐ + Thanh toán nợ */
                                <>
                                  {isOverdue ? (
                                    <span className="status-badge overdue">⚠️ Quá hạn</span>
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
                                    💰 Thanh toán công nợ
                                  </button>
                                </>
                              ) : (
                                /* CHƯA THANH TOÁN → 1 nút duy nhất: Xuất hóa đơn */
                                <button
                                  type="button"
                                  className="action-btn approve"
                                  onClick={() => openInvoiceModal(order)}
                                  disabled={confirmingPayment}
                                >
                                  📄 Xuất hóa đơn
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

      {/* View documents modal */}
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

      {/* ============================
          MODAL HÓA ĐƠN (GỘP THANH TOÁN)
          - mode 'new': chọn Trả hết/Ghi nợ + điền form HĐ
          - mode 'reprint': chỉ điền form HĐ để in lại
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
                aria-label="Đóng popup"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* ===== CHỌN THANH TOÁN (chỉ hiện khi mode 'new') ===== */}
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

                  {/* Hiện field nhập hạn trả khi chọn Ghi công nợ */}
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

              {/* ===== THÔNG TIN HÓA ĐƠN ===== */}
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

              {/* ===== NÚT SUBMIT ===== */}
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
                      ? (paymentChoice === 'debt' ? '📋 Ghi công nợ & Xuất HĐ' : '💰 Xác nhận trả hết & Xuất HĐ')
                      : '🖨️ In lại hóa đơn'
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
