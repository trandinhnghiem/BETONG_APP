const express = require('express')
const multer = require('multer')

const {
  authMiddleware,
  roleMiddleware
} = require('../middlewares/auth')

const CustomerDebtController =
  require('../controllers/customerDebtController')

const router = express.Router()

const upload =
  multer({
    dest: 'uploads/'
  })

router.use(authMiddleware)

router.post(
  '/import',
  roleMiddleware(['Accounting']),
  upload.single('file'),
  CustomerDebtController.importDebt
)

router.get(
  '/',
  roleMiddleware(['Accounting', 'Coordinator']),
  CustomerDebtController.getDebts
)

module.exports = router