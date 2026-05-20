const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')
const { getConnection } = require('../config/database')

// =====================
// GET REPORT DATA
// =====================
exports.getReportData = async (req, res) => {
  try {
    const pool = await getConnection()

    const result = await pool.request().query(`
      SELECT
        Id,
        OrderCode,
        CustomerName,
        TotalAmount,
        OrderStatus,
        CreatedAt
      FROM Orders
      ORDER BY CreatedAt DESC
    `)

    res.json(result.recordset)

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// =====================
// EXPORT EXCEL
// =====================
exports.exportExcel = async (req, res) => {
  try {

    const pool = await getConnection()

    const result = await pool.request().query(`
      SELECT OrderCode, CustomerName, TotalAmount, OrderStatus, CreatedAt
      FROM Orders
      ORDER BY CreatedAt DESC
    `)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Reports')

    sheet.columns = [
      { header: 'Mã đơn', key: 'OrderCode', width: 20 },
      { header: 'Khách hàng', key: 'CustomerName', width: 25 },
      { header: 'Doanh thu', key: 'TotalAmount', width: 15 },
      { header: 'Trạng thái', key: 'OrderStatus', width: 15 },
      { header: 'Ngày tạo', key: 'CreatedAt', width: 20 }
    ]

    result.recordset.forEach(row => {
      sheet.addRow(row)
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=report.xlsx'
    )

    await workbook.xlsx.write(res)
    res.end()

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Lỗi export Excel' })
  }
}

// =====================
// EXPORT PDF
// =====================
exports.exportPDF = async (req, res) => {
  try {

    const pool = await getConnection()

    const result = await pool.request().query(`
      SELECT OrderCode, CustomerName, TotalAmount, OrderStatus, CreatedAt
      FROM Orders
      ORDER BY CreatedAt DESC
    `)

    const doc = new PDFDocument()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf')

    doc.pipe(res)

    doc.fontSize(18).text('BAO CAO DON HANG', { align: 'center' })
    doc.moveDown()

    result.recordset.forEach(item => {
      doc.fontSize(12).text(
        `${item.OrderCode} | ${item.CustomerName || 'Khách lẻ'} | ${item.TotalAmount} | ${item.OrderStatus}`
      )
    })

    doc.end()

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Lỗi export PDF' })
  }
}