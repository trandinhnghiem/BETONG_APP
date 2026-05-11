const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");
const { authenticateToken } = require("../middlewares/auth");

router.get("/", authenticateToken, ordersController.getAllOrders);
router.get("/:id", authenticateToken, ordersController.getOrderById);
router.post("/", authenticateToken, ordersController.createOrder);
router.put("/:id", authenticateToken, ordersController.updateOrder);

module.exports = router;
