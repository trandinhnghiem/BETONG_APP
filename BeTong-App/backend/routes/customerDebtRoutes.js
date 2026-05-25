const express = require('express')
const router = express.Router()

const multer = require('multer')

const upload = multer()

const customerDebtController =
  require('../controllers/customerDebtController')

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