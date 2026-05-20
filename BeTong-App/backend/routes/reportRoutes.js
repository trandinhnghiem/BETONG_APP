const express = require('express')
const router = express.Router()

const reportController = require('../controllers/reportController')

router.get('/', reportController.getReportData)
router.get('/export/excel', reportController.exportExcel)
router.get('/export/pdf', reportController.exportPDF)

module.exports = router