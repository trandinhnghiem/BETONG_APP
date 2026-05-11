const express = require('express')
const OrderController = require('../controllers/orderController')
const { authMiddleware, roleMiddleware } = require('../middlewares/auth')

const router = express.Router()

// All order routes require authentication
router.use(authMiddleware)

// Public routes for all authenticated users
router.get('/products', OrderController.getProducts)
router.get('/stations', OrderController.getStations)

// Coordinator routes
router.post('/', roleMiddleware(['Coordinator']), OrderController.createOrder)
router.get('/my-orders', roleMiddleware(['Coordinator']), OrderController.getMyOrders)
router.get('/', roleMiddleware(['Admin', 'Leader']), OrderController.getAllOrders)
router.post('/:orderId/status', roleMiddleware(['Coordinator', 'Station']), OrderController.updateStatus)

// Accounting routes
router.get('/pending-approval', roleMiddleware(['Accounting']), OrderController.getPendingApprovalOrders)
router.post('/:orderId/approve', roleMiddleware(['Accounting']), OrderController.approveOrder)
router.post('/:orderId/reject', roleMiddleware(['Accounting']), OrderController.rejectOrder)
router.post('/:orderId/confirm-payment', roleMiddleware(['Accounting']), OrderController.confirmPayment)

// Common routes
router.get('/:orderId', OrderController.getOrderById)

module.exports = router
