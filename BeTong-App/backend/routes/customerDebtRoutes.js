const express = require('express')
const multer = require('multer')

const {
  authMiddleware,
  roleMiddleware
} = require('../middlewares/auth')

const CustomerDebtController =
  require('../controllers/CustomerDebtController')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage()
})

router.use(authMiddleware)

// GET ALL
router.get(
  '/',
  roleMiddleware(['Accounting', 'Coordinator']),
  CustomerDebtController.getAll
)

// IMPORT EXCEL
router.post(
  '/import',
  roleMiddleware(['Accounting']),
  upload.single('file'),
  CustomerDebtController.importDebts
)

module.exports = router