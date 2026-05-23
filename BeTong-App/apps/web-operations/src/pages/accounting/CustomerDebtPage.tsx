import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import './CustomerDebtPage.css'

interface Debt {
  Id: number
  CustomerName: string
  DebtAmount: number
}

export default function CustomerDebtPage() {

  const [file, setFile] =
    useState<File | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [debts, setDebts] =
    useState<Debt[]>([])

  useEffect(() => {
    fetchDebts()
  }, [])

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

  return (

    <div className="customer-debt-page">

      <div className="page-header">

        <div>

          <h1>
            Quản lý công nợ
          </h1>

          <p>
            Import file Excel công nợ khách hàng
          </p>

        </div>

      </div>

      {/* IMPORT */}

      <div className="import-card">

        <h3>
          Import Excel công nợ
        </h3>

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

      {/* TABLE */}

      <div className="table-card">

        <table>

          <thead>

            <tr>

              <th>
                Khách hàng
              </th>

              <th>
                Công nợ
              </th>

            </tr>

          </thead>

          <tbody>

            {
              debts.map(item => (

                <tr key={item.Id}>

                  <td>
                    {item.CustomerName}
                  </td>

                  <td className="money">

                    {
                      item.DebtAmount.toLocaleString()
                    } đ

                  </td>

                </tr>
              ))
            }

          </tbody>

        </table>

      </div>

    </div>
  )
}