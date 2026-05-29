const VehicleModel =
  require('../models/VehicleModel')
const XLSX =
  require('xlsx')

const fs =
  require('fs')

class VehicleController {

  // =========================
  // GET VEHICLES
  // =========================

  static async getVehicles(
    req,
    res
  ) {

    try {

      const vehicles =
        await VehicleModel.findAll()

      res.json(vehicles)

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error:
          'Lỗi tải danh sách xe'
      })

    }

  }

  // =========================
  // CREATE VEHICLE
  // =========================

  static async createVehicle(
    req,
    res
  ) {

    try {

      await VehicleModel.create(
        req.body
      )

      res.json({
        message:
          'Thêm xe thành công'
      })

    } catch (err) {

      console.error(err)

      res.status(500).json({
        error:
          'Lỗi thêm xe'
      })

    }

  }

  // =========================
// IMPORT EXCEL
// =========================

static async importExcel(
  req,
  res
) {

  try {

    if (!req.file) {

      return res.status(400).json({
        error:
          'Chưa chọn file'
      })

    }

    // đọc file excel
    const workbook =
      XLSX.readFile(
        req.file.path
      )

    const sheetName =
      workbook.SheetNames[0]

    const worksheet =
      workbook.Sheets[sheetName]

    const data =
      XLSX.utils.sheet_to_json(
        worksheet
      )

    // map dữ liệu
    const vehicles =
      data.map(row => ({

        LicensePlate:
          row['Biển số'] || '',

        DriverName:
          row['Tài xế'] || '',

        DriverPhone:
          row['SĐT'] || '',

        Capacity:
          Number(
            row['Tải trọng']
          ) || 0

      }))

    await VehicleModel.bulkInsert(
      vehicles
    )

    // xóa file upload
    fs.unlinkSync(
      req.file.path
    )

    res.json({
      message:
        'Import Excel thành công'
    })

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error:
        'Import thất bại'
    })

  }

}

}

module.exports =
  VehicleController