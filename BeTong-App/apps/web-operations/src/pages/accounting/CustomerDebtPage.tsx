import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import './CustomerDebtPage.css'

interface Debt {
  Id: number
  CustomerName: string
  DebtAmount: number
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
      customerName: '',
      debtAmount: '',
      debtLimit: ''
    })

  const [editingId, setEditingId] =
    useState<number | null>(null)

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

      const formData =
        new FormData()

      formData.append('file', file)

      await apiClient.post(
        '/api/customer-debts/import',
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data'
          }
        }
      )

      alert('Import công nợ thành công')

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
            customerName:
              form.customerName,

            debtAmount:
              Number(form.debtAmount),

            debtLimit:
              Number(form.debtLimit)
          }
        )

        alert('Cập nhật thành công')

      } else {
        console.log({
            customerName:
                form.customerName,

            debtAmount:
                Number(form.debtAmount),

            debtLimit:
                Number(form.debtLimit)
            })

            console.log({
                customerName: form.customerName,
                debtAmount: Number(form.debtAmount),
                debtLimit: Number(form.debtLimit)
                })

        await apiClient.post(
        '/api/customer-debts',
        {
            customerName: form.customerName.trim(),
            debtAmount: Number(form.debtAmount),
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
        customerName: '',
        debtAmount: '',
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
      customerName:
        item.CustomerName,

      debtAmount:
        item.DebtAmount.toString(),

      debtLimit:
        item.DebtLimit.toString()
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })

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
            placeholder="Công nợ"
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

      </div>

      {/* IMPORT */}

      <div className="import-card">

        <h3>
          Import Excel công nợ
        </h3>

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
                  Khách hàng
                </th>

                <th>
                  Công nợ
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
                      item.CustomerName
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

                  .map(item => (

                    <tr key={item.Id}>

                      <td>
                        {item.CustomerName}
                      </td>

                      <td className="money">

                        {
                          item.DebtAmount.toLocaleString()
                        } đ

                      </td>

                      <td className="money">

                        {
                          item.DebtLimit.toLocaleString()
                        } đ

                      </td>

                      <td>

                        <button
                          className="edit-btn"
                          onClick={() =>
                            handleEdit(item)
                          }
                        >

                          Sửa

                        </button>

                      </td>

                    </tr>

                  ))
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