const express = require('express')
const multer = require('multer')
const OrderController = require('../controllers/orderController')
const { authMiddleware, roleMiddleware } = require('../middlewares/auth')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// All order routes require authentication
router.use(authMiddleware)

// Public routes for all authenticated users
router.get('/products', OrderController.getProducts)
router.get('/stations', OrderController.getStations)

// Coordinator routes
router.post('/', roleMiddleware(['Coordinator']), OrderController.createOrder)
router.get('/my-orders', roleMiddleware(['Coordinator']), OrderController.getMyOrders)
router.get('/export', roleMiddleware(['Accounting', 'Coordinator']), OrderController.exportOrdersReport)
router.post('/:orderId/status', roleMiddleware(['Coordinator', 'Station', 'Engineer', 'Accounting']), OrderController.updateStatus)

// Engineer routes
router.get('/engineer-orders', roleMiddleware(['Engineer']), OrderController.getEngineerOrders)
router.get(
  '/:orderId/upload-documents',
  roleMiddleware(['Engineer']),
  OrderController.getUploadedDocuments
)
router.post(
  '/:orderId/upload-documents',
  roleMiddleware(['Engineer']),
  upload.array('files', 10),
  OrderController.uploadDocuments
)

// Station routes
router.get('/station-orders', roleMiddleware(['Station']), OrderController.getStationOrders)

// Accounting routes
router.get('/pending-approval', roleMiddleware(['Accounting']), OrderController.getPendingApprovalOrders)
router.get(
  '/accounting-orders',
  roleMiddleware(['Accounting']),
  OrderController.getAccountingOrders
)
router.post('/:orderId/confirm-payment', roleMiddleware(['Accounting']), OrderController.confirmPayment)

// Admin routes
router.get(
  '/',
  roleMiddleware(['Admin', 'Accounting']),
  OrderController.getAllOrders
)
router.get(
  '/accounting-orders',
  roleMiddleware(['Accounting']),
  OrderController.getAccountingOrders
)
// Common routes
router.get('/:orderId', OrderController.getOrderById)

module.exports = router
