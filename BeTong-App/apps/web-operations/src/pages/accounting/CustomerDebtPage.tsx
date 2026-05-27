import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import './CustomerDebtPage.css'

interface Debt {
  Id: number
  CustomerCode: string
  CustomerName: string
  DebtAmount: number
  CreditAmount: number
  DebtLimit: number
}

export default function CustomerDebtPage() {

  const [file, setFile] =
    useState<File | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [debts, setDebts] =
    useState<Debt[]>([])

  const [search, setSearch] =
    useState('')

  const [
    selectedCustomer,
    setSelectedCustomer
  ] = useState('')

  const [form, setForm] =
    useState({
      customerCode: '',
      customerName: '',
      debtAmount: '',
      creditAmount: '',
      debtLimit: ''
    })

  const [editingId, setEditingId] =
    useState<number | null>(null)

  // Import result
  const [importResult, setImportResult] =
    useState<{ message: string; imported: number; skipped: number } | null>(null)

  useEffect(() => {
    fetchDebts()
  }, [])

  // ================= FETCH =================

  const fetchDebts = async () => {

    try {

      const res =
        await apiClient.get(
          '/api/customer-debts'
        )

      setDebts(res.data || [])

    } catch (err) {

      console.error(err)

    }

  }

  // ================= IMPORT =================

  const handleImport = async () => {

    if (!file) {

      alert('Vui lòng chọn file')

      return

    }

    try {

      setLoading(true)
      setImportResult(null)

      const formData =
        new FormData()

      formData.append('file', file)

      const res = await apiClient.post(
        '/api/customer-debts/import',
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }
      )

      setImportResult({
        message: res.data.message,
        imported: res.data.imported,
        skipped: res.data.skipped
      })

      setFile(null)

      fetchDebts()

    } catch (err: any) {

      console.error(err)

      alert(
        err?.response?.data?.error ||
        'Import thất bại'
      )

    } finally {

      setLoading(false)

    }

  }

  // ================= SAVE =================

  const handleSave = async () => {

    if (
      !form.customerName ||
      !form.debtAmount ||
      !form.debtLimit
    ) {

      alert('Vui lòng nhập đầy đủ')

      return

    }

    try {

      if (editingId) {

        await apiClient.put(
          `/api/customer-debts/${editingId}`,
          {
            customerCode:
              form.customerCode.trim(),

            customerName:
              form.customerName.trim(),

            debtAmount:
              Number(form.debtAmount),

            creditAmount:
              Number(form.creditAmount || 0),

            debtLimit:
              Number(form.debtLimit)
          }
        )

        alert('Cập nhật thành công')

      } else {

        await apiClient.post(
          '/api/customer-debts',
          {
            customerCode: form.customerCode.trim(),
            customerName: form.customerName.trim(),
            debtAmount: Number(form.debtAmount),
            creditAmount: Number(form.creditAmount || 0),
            debtLimit: Number(form.debtLimit)
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        alert('Thêm khách hàng thành công')

      }

      setForm({
        customerCode: '',
        customerName: '',
        debtAmount: '',
        creditAmount: '',
        debtLimit: ''
      })

      setEditingId(null)

      fetchDebts()

    } catch (err: any) {

      console.error(err)

      alert(
        err?.response?.data?.error ||
        'Lưu thất bại'
      )

    }

  }

  // ================= EDIT =================

  const handleEdit = (
    item: Debt
  ) => {

    setEditingId(item.Id)

    setForm({
      customerCode:
        item.CustomerCode || '',

      customerName:
        item.CustomerName,

      debtAmount:
        item.DebtAmount.toString(),

      creditAmount:
        (item.CreditAmount || 0).toString(),

      debtLimit:
        item.DebtLimit.toString()
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })

  }

  const handleDelete = async (id: number) => {
    const confirmDelete =
      window.confirm('Bạn có chắc muốn xóa khách hàng này không?')
    if (!confirmDelete) return

    try {
        await apiClient.delete(
          `/api/customer-debts/${id}`
        )
        alert('Xóa khách hàng thành công')
        fetchDebts()
    } catch (err: any) {
        console.error(err)
        alert(
            err?.response?.data?.error ||
            'Xóa thất bại'
        )
    }
  }

  // ================= FORMAT MONEY =================

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN')
  }

  // ================= TÍNH NỢ THUẦN =================

  const getNetDebt = (item: Debt) => {
    return (item.DebtAmount || 0) - (item.CreditAmount || 0)
  }

  return (

    <div className="customer-debt-page">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Quản lý công nợ
          </h1>

          <p>
            Import & quản lý công nợ khách hàng
          </p>

        </div>

      </div>

      {/* FORM */}

      <div className="form-card">

        <h3>

          {
            editingId
              ? 'Chỉnh sửa khách hàng'
              : 'Thêm khách hàng'
          }

        </h3>

        <div className="manual-form">

          <input
            type="text"
            placeholder="Mã khách hàng"
            value={form.customerCode}
            onChange={(e) =>
              setForm({
                ...form,
                customerCode:
                  e.target.value
              })
            }
          />

          <input
            type="text"
            placeholder="Tên khách hàng"
            value={form.customerName}
            onChange={(e) =>
              setForm({
                ...form,
                customerName:
                  e.target.value
              })
            }
          />

          <input
            type="number"
            placeholder="Dư cuối Nợ"
            value={form.debtAmount}
            onChange={(e) =>
              setForm({
                ...form,
                debtAmount:
                  e.target.value
              })
            }
          />

          <input
            type="number"
            placeholder="Dư cuối Có"
            value={form.creditAmount}
            onChange={(e) =>
              setForm({
                ...form,
                creditAmount:
                  e.target.value
              })
            }
          />

          <input
            type="number"
            placeholder="Hạn mức"
            value={form.debtLimit}
            onChange={(e) =>
              setForm({
                ...form,
                debtLimit:
                  e.target.value
              })
            }
          />

          <button
            className="save-btn"
            onClick={handleSave}
          >

            {
              editingId
                ? 'Cập nhật'
                : 'Thêm mới'
            }

          </button>

        </div>

        {/* Gợi ý hạn mức */}
        {!editingId && form.debtAmount && (
          <div className="limit-hint">
            💡 Gợi ý hạn mức: {formatMoney(Math.max(Number(form.debtAmount) * 1.5, 10000000))} đ
            <span className="limit-hint-detail">
              (max(Nợ × 1.5, 10 triệu), làm tròn xuống triệu chẵn)
            </span>
          </div>
        )}

      </div>

      {/* IMPORT */}

      <div className="import-card">

        <h3>
          Import Excel công nợ
        </h3>

        <p className="import-guide">
          File Excel cần có cấu trúc: Cột A = Mã khách hàng, Cột B = Tên khách hàng,
          Cột G = Dư cuối Nợ, Cột H = Dư cuối Có.
          Chỉ các dòng có Mã khách hàng mới được import.
          Hạn mức tự động tính: max(Nợ × 1.5, 10 triệu).
        </p>

        <div className="import-row">

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) =>
              setFile(
                e.target.files?.[0] || null
              )
            }
          />

          <button
            className="import-btn"
            onClick={handleImport}
            disabled={loading}
          >

            {
              loading
                ? 'Đang import...'
                : 'Import công nợ'
            }

          </button>

        </div>

        {/* Import result */}
        {importResult && (
          <div className="import-result">
            ✅ {importResult.message}
            <br />
            <span className="import-detail">
              Đã import: {importResult.imported} khách hàng | Bỏ qua: {importResult.skipped} dòng
            </span>
          </div>
        )}

      </div>

      {/* TABLE */}

      <div className="table-card">

        <h3>
          Danh sách công nợ
        </h3>

        {/* SEARCH */}

        <div className="search-box">

            <input
                type="text"
                placeholder="Tìm kiếm khách hàng..."
                value={search}
                onChange={(e) =>
                setSearch(e.target.value)
                }
            />

            <select
                value={selectedCustomer}
                onChange={(e) =>
                setSelectedCustomer(
                    e.target.value
                )
                }
            >

                <option value="">
                -- Chọn khách hàng --
                </option>

                {debts.map(item => (

                <option
                    key={item.Id}
                    value={item.CustomerName}
                >

                    {item.CustomerName}

                </option>

                ))}

            </select>

            <button
                className="reset-btn"
                onClick={() => {

                setSearch('')
                setSelectedCustomer('')

                }}
            >

                Reset

            </button>

            </div>

        <div className="table-wrapper">

          <table className="debt-table">

            <thead>

              <tr>

                <th>
                  Mã KH
                </th>

                <th>
                  Khách hàng
                </th>

                <th>
                  Dư cuối Nợ
                </th>

                <th>
                  Dư cuối Có
                </th>

                <th>
                  Nợ thuần
                </th>

                <th>
                  Hạn mức
                </th>

                <th>
                  Hành động
                </th>

              </tr>

            </thead>

            <tbody>

              {
                debts

                  .filter(item => {

                    const keyword =
                      search.toLowerCase()

                    const matchSearch =
                      (item.CustomerName || '')
                        .toLowerCase()
                        .includes(keyword) ||
                      (item.CustomerCode || '')
                        .toLowerCase()
                        .includes(keyword)

                    const matchDropdown =
                      !selectedCustomer ||

                      item.CustomerName ===
                      selectedCustomer

                    return (
                      matchSearch &&
                      matchDropdown
                    )

                  })

                  .map(item => {

                    const netDebt = getNetDebt(item)
                    const isOverLimit = netDebt > item.DebtLimit

                    return (

                      <tr key={item.Id} className={isOverLimit ? 'over-limit-row' : ''}>

                        <td className="code-cell">
                          {item.CustomerCode || '-'}
                        </td>

                        <td>
                          {item.CustomerName}
                        </td>

                        <td className="money">

                          {formatMoney(item.DebtAmount || 0)} đ

                        </td>

                        <td className="money credit">

                          {formatMoney(item.CreditAmount || 0)} đ

                        </td>

                        <td className={`money${isOverLimit ? ' text-danger' : netDebt > 0 ? ' text-warning' : ' text-success'}`}>

                          {formatMoney(netDebt)} đ

                          {isOverLimit && <span className="over-badge">!</span>}

                        </td>

                        <td className="money">

                          {formatMoney(item.DebtLimit)} đ

                        </td>

                        <td>

                          <div className="action-group">
                              <button
                                  className="edit-btn"
                                  onClick={() =>
                                      handleEdit(item)
                                  }
                                  >
                                  Sửa
                              </button>
                              <button
                                  className="delete-btn"
                                  onClick={() =>
                                      handleDelete(item.Id)
                                  }
                                  >
                                  Xóa
                              </button>
                          </div>

                        </td>

                      </tr>

                    )
                  })
              }

            </tbody>

          </table>

          {
            debts.length === 0 && (

              <div className="empty">

                Chưa có dữ liệu công nợ

              </div>

            )
          }

        </div>

      </div>

    </div>

  )

}
