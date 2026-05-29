
import {
  useEffect,
  useState
} from 'react'

import {
  FiPlus,
  FiUpload,
  FiDownload,
  FiTruck
} from 'react-icons/fi'

import apiClient
  from '../../services/api'

import './VehiclesPage.css'

import * as ExcelJS
  from 'exceljs'

interface Vehicle {

  Id: number

  LicensePlate: string

  DriverName: string

  DriverPhone: string

  Capacity: number

  VehicleStatus: string

}

export default function VehiclesPage() {

  const [vehicles, setVehicles] =
    useState<Vehicle[]>([])

  const [excelFile, setExcelFile] =
    useState<File | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [form, setForm] =
    useState({

      licensePlate: '',

      driverName: '',

      driverPhone: '',

      capacity: ''

    })

  // =========================
  // FETCH
  // =========================

  useEffect(() => {

    fetchVehicles()

  }, [])

  const fetchVehicles =
    async () => {

      try {

        const res =
          await apiClient.get(
            '/api/vehicles'
          )

        setVehicles(res.data)

      } catch (err) {

        console.error(err)

      }

    }

  // =========================
  // ADD VEHICLE
  // =========================

  const handleSubmit =
    async (
      e: React.FormEvent
    ) => {

      e.preventDefault()

      try {

        setLoading(true)

        await apiClient.post(
          '/api/vehicles',
          form
        )

        setForm({

          licensePlate: '',

          driverName: '',

          driverPhone: '',

          capacity: ''

        })

        fetchVehicles()

      } catch (err) {

        console.error(err)

        alert(
          'Thêm xe thất bại'
        )

      } finally {

        setLoading(false)

      }

    }

  // =========================
  // IMPORT EXCEL
  // =========================

  const handleImportExcel =
    async () => {

      if (!excelFile) {

        alert(
          'Vui lòng chọn file Excel'
        )

        return

      }

      try {

        setLoading(true)

        const formData =
          new FormData()

        formData.append(
          'file',
          excelFile
        )

        await apiClient.post(
          '/api/vehicles/import',
          formData,
          {
            headers: {
              'Content-Type':
                'multipart/form-data'
            }
          }
        )

        alert(
          'Import Excel thành công'
        )

        setExcelFile(null)

        fetchVehicles()

      } catch (err) {

        console.error(err)

        alert(
          'Import Excel thất bại'
        )

      } finally {

        setLoading(false)

      }

    }

  // =========================
  // DOWNLOAD TEMPLATE
  // =========================

  const downloadTemplate =
    async () => {

      try {

        const workbook =
          new ExcelJS.Workbook()

        const sheet =
          workbook.addWorksheet(
            'MauImportXe'
          )

        sheet.columns = [

          {
            header: 'Biển số',
            key: 'LicensePlate',
            width: 24
          },

          {
            header: 'Tài xế',
            key: 'DriverName',
            width: 28
          },

          {
            header: 'SĐT',
            key: 'DriverPhone',
            width: 22
          },

          {
            header: 'Tải trọng',
            key: 'Capacity',
            width: 18
          }

        ]

        sheet.addRow({

          LicensePlate:
            '65H-12345',

          DriverName:
            'Nguyễn Văn A',

          DriverPhone:
            '0912345678',

          Capacity:
            10

        })

        sheet.getRow(1).font = {

          bold: true,

          color: {
            argb: 'FFFFFFFF'
          }

        }

        sheet.getRow(1).fill = {

          type: 'pattern',

          pattern: 'solid',

          fgColor: {
            argb: '1677FF'
          }

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
          'mau-import-xe.xlsx'

        a.click()

        window.URL.revokeObjectURL(
          url
        )

      } catch (err) {

        console.error(err)

        alert(
          'Tải file mẫu thất bại'
        )

      }

    }

  const getStatusText = (
    status: string
  ) => {

    if (
      status === 'Delivering'
    ) {

      return 'Đang giao'

    }

    return 'Sẵn sàng'

  }

  return (

    <div className="vehicles-page">

      <div className="page-header">

        <div>

          <h1>
            🚚 Quản lý phương tiện
          </h1>

          <p>
            Quản lý xe giao hàng,
            tài xế và trạng thái hoạt động
          </p>

        </div>

      </div>

      <div className="vehicle-card">

        <form
          onSubmit={handleSubmit}
          className="vehicle-form"
        >

          <div className="form-group">

            <label>
              Biển số xe
            </label>

            <input
              placeholder="VD: 65H-12345"
              value={form.licensePlate}
              onChange={(e) =>
                setForm({
                  ...form,
                  licensePlate:
                    e.target.value
                })
              }
            />

          </div>

          <div className="form-group">

            <label>
              Tài xế
            </label>

            <input
              placeholder="Tên tài xế"
              value={form.driverName}
              onChange={(e) =>
                setForm({
                  ...form,
                  driverName:
                    e.target.value
                })
              }
            />

          </div>

          <div className="form-group">

            <label>
              Số điện thoại
            </label>

            <input
              placeholder="Nhập SĐT"
              value={form.driverPhone}
              onChange={(e) =>
                setForm({
                  ...form,
                  driverPhone:
                    e.target.value
                })
              }
            />

          </div>

          <div className="form-group">

            <label>
              Tải trọng (m³)
            </label>

            <input
              type="number"
              placeholder="VD: 10"
              value={form.capacity}
              onChange={(e) =>
                setForm({
                  ...form,
                  capacity:
                    e.target.value
                })
              }
            />

          </div>

          <button
            type="submit"
            className="add-btn"
            disabled={loading}
          >

            <FiPlus size={18} />

            {loading
              ? 'Đang thêm...'
              : 'Thêm xe'}

          </button>

        </form>

        <div className="import-section">

          <div className="file-box">

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) =>

                setExcelFile(
                  e.target.files?.[0] || null
                )

              }
            />

          </div>

          <button
            className="import-btn"
            onClick={handleImportExcel}
          >

            <FiUpload size={16} />

            Import Excel

          </button>

          <button
            className="template-btn"
            onClick={downloadTemplate}
          >

            <FiDownload size={16} />

            Tải file mẫu Excel

          </button>

        </div>

      </div>

      <div className="table-card">

        <div className="table-scroll">

          <table>

            <thead>

              <tr>

                <th className="col-plate">
                  Biển số
                </th>

                <th className="col-driver">
                  Tài xế
                </th>

                <th className="col-phone">
                  SĐT
                </th>

                <th className="col-capacity">
                  Tải trọng
                </th>

                <th className="col-status">
                  Trạng thái
                </th>

              </tr>

            </thead>

            <tbody>

              {vehicles.length === 0 ? (

                <tr>

                  <td
                    colSpan={5}
                    className="empty-row"
                  >

                    Chưa có phương tiện nào

                  </td>

                </tr>

              ) : (

                vehicles.map(v => (

                  <tr key={v.Id}>

                    <td className="col-plate plate">

                      <FiTruck />

                      {v.LicensePlate}

                    </td>

                    <td className="col-driver">
                      {v.DriverName}
                    </td>

                    <td className="col-phone">
                      {v.DriverPhone}
                    </td>

                    <td className="col-capacity">
                      {v.Capacity} m³
                    </td>

                    <td className="col-status">

                      <span
                        className={`status-badge ${v.VehicleStatus}`}
                      >

                        {getStatusText(
                          v.VehicleStatus
                        )}

                      </span>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  )

}
