import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FiEdit2, FiEye, FiUpload, FiX } from 'react-icons/fi'
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

const buildInvoiceHtml = (order: Order, form: InvoiceFormData) => {
  const totalLabel = order.totalAmount.toLocaleString('vi-VN')
  const invoiceDateLabel = formatVNDate(form.invoiceDate)

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

      <div class="note">
        <strong>Ghi chú:</strong>
        <div style="margin-top: 8px;">${escapeHtml(form.note || 'Không có ghi chú')}</div>
      </div>
    </div>
    <script>
      window.onload = function () {
        window.focus()
        window.print()
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
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; orderId: number | null }>({ open: false, orderId: null })
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
        paymentStatus: o.PaymentStatus || 'pending'
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

  const openPaymentModal = (order: Order) => {
    setInvoiceForm({
      invoiceNumber: `HD-${order.orderCode}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Tiền mặt',
      note: '',
      customerName: order.customerName || 'Khách hàng'
    })
    setPaymentModal({ open: true, orderId: order.id })
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

  const handleConfirmPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!paymentModal.orderId) return

    const order = orders.find(currentOrder => currentOrder.id === paymentModal.orderId)

    if (!order) return

    if (!invoiceForm.invoiceNumber.trim() || !invoiceForm.invoiceDate.trim()) {
      alert('Vui lòng nhập số hóa đơn và ngày lập hóa đơn')
      return
    }

    try {
      setConfirmingPayment(true)
      await apiClient.post(`/api/orders/${order.id}/confirm-payment`)
      await fetchOrders()

      const newWindow = window.open('', '_blank', 'noopener,noreferrer')
      if (!newWindow) {
        alert('Vui lòng bật popup trình duyệt để xuất hóa đơn PDF')
        return
      }

      newWindow.document.write(buildInvoiceHtml(order, invoiceForm))
      newWindow.document.close()
      newWindow.focus()
      setPaymentModal({ open: false, orderId: null })
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.error || 'Xác nhận thanh toán thất bại')
    } finally {
      setConfirmingPayment(false)
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
                <th>Trạm nhận</th>
                <th>Công nợ</th>
                <th>Tổng tiền</th>
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
                                <span className="status-badge green">Đã thanh toán</span>
                              ) : (
                                <button
                                  type="button"
                                  className="action-btn approve"
                                  onClick={() => openPaymentModal(order)}
                                  disabled={confirmingPayment}
                                >
                                  Xác nhận thanh toán
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

      {paymentModal.open && (
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
              width: 'min(560px, 100%)',
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0 }}>Xác nhận thanh toán</h3>
                <p style={{ margin: '6px 0 0', color: '#6b7280' }}>
                  Điền thông tin hóa đơn để xuất file PDF cho đơn <strong>{paymentModal.orderId}</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPaymentModal({ open: false, orderId: null })}
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

            <form onSubmit={handleConfirmPayment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Số hóa đơn</span>
                <input
                  value={invoiceForm.invoiceNumber}
                  onChange={event => setInvoiceForm(prev => ({ ...prev, invoiceNumber: event.target.value }))}
                  placeholder="VD: HD-ORD001"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Ngày lập</span>
                <input
                  type="date"
                  value={invoiceForm.invoiceDate}
                  onChange={event => setInvoiceForm(prev => ({ ...prev, invoiceDate: event.target.value }))}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Khách hàng</span>
                <input
                  value={invoiceForm.customerName}
                  onChange={event => setInvoiceForm(prev => ({ ...prev, customerName: event.target.value }))}
                  placeholder="Tên khách hàng"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Phương thức thanh toán</span>
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
                <span style={{ fontWeight: 700 }}>Ghi chú</span>
                <textarea
                  rows={4}
                  value={invoiceForm.note}
                  onChange={event => setInvoiceForm(prev => ({ ...prev, note: event.target.value }))}
                  placeholder="Thông tin bổ sung"
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="action-btn" onClick={() => setPaymentModal({ open: false, orderId: null })}>
                  Hủy
                </button>
                <button type="submit" className="action-btn approve" disabled={confirmingPayment}>
                  {confirmingPayment ? 'Đang xử lý...' : 'Xuất hóa đơn & xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
