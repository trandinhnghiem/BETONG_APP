import { FormEvent, useEffect, useState } from "react";
import { HiPlus } from "react-icons/hi2";
import { MdRefresh } from "react-icons/md";
import LoadingModal from "../components/LoadingModal";
import NotificationModal from "../components/NotificationModal";
import api from "../services/api";
import "./Orders.css";

interface CementProduct {
  Id: number;
  Name: string;
}

interface Order {
  Id: number;
  CustomerName: string;
  DeliveryAddress: string;
  CustomerPhone: string;
  CementProductName: string;
  Quantity: number;
  UnitPrice: number;
  DeliveryTime: string;
  Status: string;
  IsProject: boolean;
  DebtSettlementRequired: boolean;
  DebtSettled: boolean;
  ProductionScheduleLink?: string;
  TechnicalEngineer?: string;
  PipeOperator?: string;
  FittingOperator?: string;
  PourVolumeDetails?: string;
  MixingPlant?: string;
  TruckAssigned?: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<CementProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    message: "",
  });
  const [formData, setFormData] = useState({
    CustomerName: "",
    DeliveryAddress: "",
    CustomerPhone: "",
    CementProductId: "",
    CementProductName: "",
    Quantity: "",
    UnitPrice: "",
    DeliveryTime: "",
    IsProject: false,
    DebtSettlementRequired: false,
    ProductionScheduleLink: "",
    TechnicalEngineer: "",
    PipeOperator: "",
    FittingOperator: "",
    PourVolumeDetails: "",
    MixingPlant: "",
    TruckAssigned: "",
    Notes: "",
    ViberReceiverId: "",
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders", { params: { page: 1, pageSize: 100 } });
      setOrders(res.data.data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setNotification({
        isOpen: true,
        type: "error",
        message: "Không tải được danh sách đơn hàng.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/cement-products");
      setProducts(res.data || []);
    } catch (error) {
      console.error("Error fetching cement products:", error);
    }
  };

  const handleInputChange = (key: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !formData.CustomerName ||
      !formData.DeliveryAddress ||
      !formData.CustomerPhone ||
      !formData.Quantity ||
      !formData.UnitPrice ||
      !formData.DeliveryTime
    ) {
      setNotification({
        isOpen: true,
        type: "error",
        message: "Vui lòng điền đầy đủ các thông tin bắt buộc.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        CustomerName: formData.CustomerName,
        DeliveryAddress: formData.DeliveryAddress,
        CustomerPhone: formData.CustomerPhone,
        CementProductId: formData.CementProductId
          ? parseInt(formData.CementProductId, 10)
          : null,
        CementProductName: formData.CementProductName || null,
        Quantity: parseFloat(formData.Quantity),
        UnitPrice: parseFloat(formData.UnitPrice),
        DeliveryTime: formData.DeliveryTime,
        IsProject: formData.IsProject,
        DebtSettlementRequired: formData.DebtSettlementRequired,
        ProductionScheduleLink: formData.ProductionScheduleLink || null,
        TechnicalEngineer: formData.TechnicalEngineer || null,
        PipeOperator: formData.PipeOperator || null,
        FittingOperator: formData.FittingOperator || null,
        PourVolumeDetails: formData.PourVolumeDetails || null,
        MixingPlant: formData.MixingPlant || null,
        TruckAssigned: formData.TruckAssigned || null,
        Notes: formData.Notes || null,
        ViberReceiverId: formData.ViberReceiverId || null,
      };

      await api.post("/orders", payload);
      setNotification({
        isOpen: true,
        type: "success",
        message: "Đã tạo đơn hàng mới.",
      });
      setFormData({
        CustomerName: "",
        DeliveryAddress: "",
        CustomerPhone: "",
        CementProductId: "",
        CementProductName: "",
        Quantity: "",
        UnitPrice: "",
        DeliveryTime: "",
        IsProject: false,
        DebtSettlementRequired: false,
        ProductionScheduleLink: "",
        TechnicalEngineer: "",
        PipeOperator: "",
        FittingOperator: "",
        PourVolumeDetails: "",
        MixingPlant: "",
        TruckAssigned: "",
        Notes: "",
        ViberReceiverId: "",
      });
      fetchOrders();
    } catch (error: unknown) {
      console.error("Create order error:", error);
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Lỗi khi tạo đơn hàng.";
      setNotification({ isOpen: true, type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      setLoading(true);
      await api.put(`/orders/${orderId}`, { Status: status });
      setNotification({
        isOpen: true,
        type: "success",
        message: "Cập nhật trạng thái đơn hàng thành công.",
      });
      fetchOrders();
    } catch (error) {
      console.error("Update order status error:", error);
      setNotification({
        isOpen: true,
        type: "error",
        message: "Không cập nhật được trạng thái đơn hàng.",
      });
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    "pending",
    "approved",
    "assigned",
    "delivered",
    "customer_confirmed",
    "accepted",
    "debt_settled",
    "completed",
  ];

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <p className="page-kicker">Quản lý đơn hàng</p>
          <h1>Đơn hàng bê tông</h1>
        </div>
        <button className="btn-primary" onClick={fetchOrders}>
          <MdRefresh /> Làm mới
        </button>
      </div>

      <div className="orders-grid">
        <section className="orders-form-panel">
          <div className="panel-header">
            <h2>Thêm đơn mới</h2>
            <span>Gửi thông báo Viber ngay khi tạo đơn.</span>
          </div>
          <form className="orders-form" onSubmit={handleCreateOrder}>
            <div className="form-row">
              <div className="form-group">
                <label>Khách hàng</label>
                <input
                  className="form-input"
                  value={formData.CustomerName}
                  onChange={(e) => handleInputChange("CustomerName", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Địa chỉ nhận</label>
                <input
                  className="form-input"
                  value={formData.DeliveryAddress}
                  onChange={(e) => handleInputChange("DeliveryAddress", e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  className="form-input"
                  value={formData.CustomerPhone}
                  onChange={(e) => handleInputChange("CustomerPhone", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Bê tông</label>
                <select
                  className="form-input"
                  value={formData.CementProductId}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange("CementProductId", value);
                    const product = products.find((item) => item.Id === parseInt(value, 10));
                    if (product) {
                      handleInputChange("CementProductName", product.Name);
                    }
                  }}
                >
                  <option value="">Chọn sản phẩm</option>
                  {products.map((product) => (
                    <option key={product.Id} value={product.Id}>
                      {product.Name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Khối lượng đặt</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.Quantity}
                  onChange={(e) => handleInputChange("Quantity", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Đơn giá</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.UnitPrice}
                  onChange={(e) => handleInputChange("UnitPrice", e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Thời gian giao hàng</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.DeliveryTime}
                  onChange={(e) => handleInputChange("DeliveryTime", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Người nhận Viber (ID)</label>
                <input
                  className="form-input"
                  value={formData.ViberReceiverId}
                  onChange={(e) => handleInputChange("ViberReceiverId", e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.IsProject}
                    onChange={(e) => handleInputChange("IsProject", e.target.checked)}
                  />
                  Đơn công trình
                </label>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.DebtSettlementRequired}
                    onChange={(e) => handleInputChange("DebtSettlementRequired", e.target.checked)}
                  />
                  Cần quyết toán công nợ
                </label>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Link lịch sản xuất (Google Drive)</label>
                <input
                  className="form-input"
                  value={formData.ProductionScheduleLink}
                  onChange={(e) => handleInputChange("ProductionScheduleLink", e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Kỹ thuật công trình</label>
                <input
                  className="form-input"
                  value={formData.TechnicalEngineer}
                  onChange={(e) => handleInputChange("TechnicalEngineer", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Ôm ống</label>
                <input
                  className="form-input"
                  value={formData.PipeOperator}
                  onChange={(e) => handleInputChange("PipeOperator", e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Bắt ống</label>
                <input
                  className="form-input"
                  value={formData.FittingOperator}
                  onChange={(e) => handleInputChange("FittingOperator", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Trạm trộn</label>
                <input
                  className="form-input"
                  value={formData.MixingPlant}
                  onChange={(e) => handleInputChange("MixingPlant", e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Khối lượng đổ</label>
                <input
                  className="form-input"
                  value={formData.PourVolumeDetails}
                  onChange={(e) => handleInputChange("PourVolumeDetails", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Xe giao</label>
                <input
                  className="form-input"
                  value={formData.TruckAssigned}
                  onChange={(e) => handleInputChange("TruckAssigned", e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group full-width">
                <label>Ghi chú</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.Notes}
                  onChange={(e) => handleInputChange("Notes", e.target.value)}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                <HiPlus /> Tạo đơn hàng
              </button>
            </div>
          </form>
        </section>

        <section className="orders-list-panel">
          <div className="panel-header">
            <h2>Danh sách đơn hàng</h2>
            <span>Nhấn trạng thái để cập nhật nhanh.</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Khối lượng</th>
                  <th>Giao hàng</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.Id}>
                    <td>
                      <strong>{order.CustomerName}</strong>
                      <div>{order.DeliveryAddress}</div>
                      <div>{order.CustomerPhone}</div>
                    </td>
                    <td>{order.CementProductName || "-"}</td>
                    <td>
                      {order.Quantity} m³
                      <div>{order.UnitPrice?.toLocaleString("vi-VN")}đ</div>
                    </td>
                    <td>{new Date(order.DeliveryTime).toLocaleString("vi-VN")}</td>
                    <td>
                      <select
                        className="form-input"
                        value={order.Status}
                        onChange={(e) => handleStatusChange(order.Id, e.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="status-badges">
                        {order.IsProject && <span className="badge project">Công trình</span>}
                        {order.DebtSettlementRequired && <span className="badge debt">Công nợ</span>}
                        {order.DebtSettled && <span className="badge settled">Đã quyết toán</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
      <LoadingModal isOpen={loading || saving} message={loading ? "Đang tải..." : "Đang xử lý..."} />
    </div>
  );
}
