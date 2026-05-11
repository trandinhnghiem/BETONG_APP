const fetch = require("node-fetch");

const VIBER_API_URL = "https://chatapi.viber.com/pa/send_message";
const VIBER_AUTH_TOKEN = process.env.VIBER_AUTH_TOKEN;
const VIBER_SENDER_NAME = process.env.VIBER_SENDER_NAME || "ConcreteApp";
const VIBER_DEFAULT_RECEIVER = process.env.VIBER_DEFAULT_RECEIVER;

const buildOrderMessage = (order, eventType) => {
  const lines = [
    `*${eventType}*`,
    `Khách hàng: ${order.CustomerName}`,
    `Địa chỉ: ${order.DeliveryAddress}`,
    `Số điện thoại: ${order.CustomerPhone}`,
    `Sản phẩm bê tông: ${order.CementProductName || "-"}`,
    `Khối lượng: ${order.Quantity || "-"}`,
    `Đơn giá: ${order.UnitPrice || "-"}`,
    `Thời gian giao: ${order.DeliveryTime ? new Date(order.DeliveryTime).toLocaleString("vi-VN") : "-"}`,
  ]; 

  if (order.Status) {
    lines.push(`Trạng thái: ${order.Status}`);
  }

  if (order.ProductionScheduleLink) {
    lines.push(`Lịch sản xuất: ${order.ProductionScheduleLink}`);
  }

  if (order.TechnicalEngineer) {
    lines.push(`Kỹ thuật: ${order.TechnicalEngineer}`);
  }
  if (order.PipeOperator) {
    lines.push(`Ôm ống: ${order.PipeOperator}`);
  }
  if (order.FittingOperator) {
    lines.push(`Bắt ống: ${order.FittingOperator}`);
  }
  if (order.MixingPlant) {
    lines.push(`Trạm trộn: ${order.MixingPlant}`);
  }
  if (order.TruckAssigned) {
    lines.push(`Xe giao: ${order.TruckAssigned}`);
  }

  return lines.join("\n");
};

const sendViberNotification = async (order, receiverId = null, eventType = "Đơn mới") => {
  if (!VIBER_AUTH_TOKEN) {
    console.warn("VIBER_AUTH_TOKEN is not configured. Viber notification skipped.");
    return null;
  }

  const targetReceiver = receiverId || order.ViberReceiverId || VIBER_DEFAULT_RECEIVER;
  if (!targetReceiver) {
    console.warn("No Viber receiver configured. Skipping notification.");
    return null;
  }

  const payload = {
    receiver: targetReceiver,
    min_api_version: 1,
    sender: {
      name: VIBER_SENDER_NAME,
    },
    type: "text",
    text: buildOrderMessage(order, eventType),
  };

  try {
    const response = await fetch(VIBER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VIBER_AUTH_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data.status !== 0) {
      console.warn("Viber notification failed:", data);
    }
    return data;
  } catch (error) {
    console.error("Failed to send Viber notification:", error.message);
    return null;
  }
};

module.exports = {
  sendViberNotification,
};
