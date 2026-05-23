const express = require('express')
const router = express.Router()

const {
  getAllDebts,
  createDebt,
  updateDebt,
  importDebts
} = require('../controllers/CustomerDebtController')

const multer = require('multer')

const upload = multer({
  storage: multer.memoryStorage()
})

const {
  authMiddleware,
  roleMiddleware
} = require('../middlewares/auth')

// ================= GET =================

router.get(
  '/',
  authMiddleware,
  getAllDebts
)

// ================= CREATE =================

router.post(
  '/',
  authMiddleware,
  createDebt
)

// ================= UPDATE =================

router.put(
  '/:id',
  authMiddleware,
  updateDebt
)

// ================= IMPORT =================

router.post(
  '/import',
  authMiddleware,
  upload.single('file'),
  importDebts
)

module.exports = router