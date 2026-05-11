const Order = require("../models/Order");
const CementProduct = require("../models/CementProduct");
const { sendViberNotification } = require("../services/viberService");

const ALLOWED_STATUSES = [
  "pending",
  "approved",
  "assigned",
  "delivered",
  "customer_confirmed",
  "accepted",
  "debt_settled",
  "completed",
];

const parseBoolean = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "1", "yes", "y", "on"].includes(value.toLowerCase());
  }
  return Boolean(value);
};

const getAllOrders = async (req, res) => {
  try {
    const { status, customerName, productId, assignedBy, isProject, page, pageSize } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (customerName) filters.customerName = customerName;
    if (productId) filters.productId = parseInt(productId, 10);
    if (assignedBy) filters.assignedBy = parseInt(assignedBy, 10);
    if (isProject !== undefined) filters.isProject = parseBoolean(isProject);

    const currentPage = parseInt(page, 10) || 1;
    const limit = parseInt(pageSize, 10) || 50;
    const offset = (currentPage - 1) * limit;
    filters.limit = limit;
    filters.offset = offset;

    const orders = await Order.findAll(filters);
    res.json({ data: orders, pagination: { page: currentPage, pageSize: limit, count: orders.length } });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Đơn hàng không tồn tại" });
    }
    res.json(order);
  } catch (error) {
    console.error("Get order by id error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createOrder = async (req, res) => {
  try {
    const {
      CustomerName,
      DeliveryAddress,
      CustomerPhone,
      CementProductId,
      CementProductName,
      Quantity,
      UnitPrice,
      DeliveryTime,
      IsProject,
      DebtSettlementRequired,
      ViberReceiverId,
    } = req.body;

    if (!CustomerName || !DeliveryAddress || !CustomerPhone || !Quantity || !UnitPrice || !DeliveryTime) {
      return res.status(400).json({
        error: "Thiếu thông tin bắt buộc: CustomerName, DeliveryAddress, CustomerPhone, Quantity, UnitPrice, DeliveryTime",
      });
    }

    let productName = CementProductName;
    if (CementProductId) {
      const product = await CementProduct.findById(CementProductId);
      if (product) {
        productName = product.Name;
      }
    }

    const order = await Order.create({
      CustomerName,
      DeliveryAddress,
      CustomerPhone,
      CementProductId: CementProductId || null,
      CementProductName: productName,
      Quantity,
      UnitPrice,
      DeliveryTime,
      Status: "pending",
      IsProject: parseBoolean(IsProject) || false,
      DebtSettlementRequired: parseBoolean(DebtSettlementRequired) || false,
      ViberReceiverId: ViberReceiverId || null,
    });

    await sendViberNotification(order, ViberReceiverId, "Đơn hàng mới");

    res.status(201).json(order);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Đơn hàng không tồn tại" });
    }

    const payload = {
      ...req.body,
      IsProject: parseBoolean(req.body.IsProject),
      DebtSettlementRequired: parseBoolean(req.body.DebtSettlementRequired),
      DeliveryConfirmedByCustomer: parseBoolean(req.body.DeliveryConfirmedByCustomer),
    };

    if (payload.Status && !ALLOWED_STATUSES.includes(payload.Status)) {
      return res.status(400).json({
        error: `Trạng thái đơn hàng không hợp lệ. Giá trị hợp lệ: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    if (payload.Status === "approved") {
      payload.ApprovedBy = req.user?.id || null;
      payload.ApprovedAt = new Date();
    }

    if (payload.Status === "assigned") {
      payload.DispatchAssignedBy = req.user?.id || null;
      payload.DispatchAssignedAt = new Date();
    }

    if (payload.Status === "debt_settled") {
      payload.DebtSettled = true;
    }

    if (
      order.IsProject &&
      ["customer_confirmed", "accepted", "completed"].includes(payload.Status) &&
      !order.DebtSettled &&
      !payload.DebtSettled
    ) {
      return res.status(400).json({
        error: "Đơn công trình phải hoàn tất quyết toán công nợ trước khi nghiệm thu hoặc hoàn thành.",
      });
    }

    const updatedOrder = await Order.update(id, payload);

    if (payload.Status === "approved") {
      await sendViberNotification(updatedOrder, updatedOrder.ViberReceiverId, "Đơn hàng đã được kế toán duyệt");
    }

    if (payload.Status === "assigned") {
      await sendViberNotification(updatedOrder, updatedOrder.ViberReceiverId, "Đơn hàng đã được điều phối nhận lệnh");
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
};
