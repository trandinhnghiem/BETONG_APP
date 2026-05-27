const express = require('express')
const router = express.Router()

const multer = require('multer')

const upload = multer()

const customerDebtController =
  require('../controllers/customerDebtController')

const CustomerDebtModel =
  require('../models/CustomerDebt')

// ✅ Tự động ensure columns khi routes được load
CustomerDebtModel.ensureColumns()
  .then(() => console.log('✅ CustomerDebts table columns checked'))
  .catch(err => console.error('❌ CustomerDebts ensure columns error:', err.message))

// GET
router.get(
  '/',
  customerDebtController.getAllDebts
)

// CREATE
router.post(
  '/',
  customerDebtController.createDebt
)

// UPDATE
router.put(
  '/:id',
  customerDebtController.updateDebt
)

// DELETE
router.delete(
  '/:id',
  customerDebtController.deleteDebt
)

// IMPORT EXCEL
router.post(
  '/import',
  upload.single('file'),
  customerDebtController.importDebts
)


module.exports = router
