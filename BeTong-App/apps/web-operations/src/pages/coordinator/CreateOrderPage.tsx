import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../services/api'
import './CreateOrderPage.css'

interface Product {
  Id: number
  ProductName: string
  UnitPrice: number
  UnitOfMeasure: string
}

interface Station {
  id: number
  name: string
  code: string
}
interface CustomerDebt {
  Id: number
  CustomerName: string
  DebtAmount: number
  DebtLimit: number
}

export default function CoordinatorCreateOrderPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [customers, setCustomers] =
  useState<CustomerDebt[]>([])

const [selectedCustomerDebt, setSelectedCustomerDebt] =
  useState<CustomerDebt | null>(null)

const [searchCustomer, setSearchCustomer] =
  useState('')
  
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [form, setForm] = useState({
    customerName: '',
    address: '',
    phone: '',
    concreteType: '',
    volume: '1',
    price: '0',
    deliveryTime: '',
    technicalEngineer: '',
    pipeOperator: '',
    pipeInstaller: '',
    pouringInstructions: '',
    mixingStationId: '',
    truck: ''
  })

  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts()
    fetchStations()
    fetchCustomers()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/api/orders/products')
      setProducts(response.data || [])
    } catch (error) {
      console.error('Lỗi tải sản phẩm:', error)
      setProducts([
        { Id: 1, ProductName: 'Bê tông mác 300', UnitPrice: 550000, UnitOfMeasure: 'm³' },
        { Id: 2, ProductName: 'Bê tông mác 250', UnitPrice: 520000, UnitOfMeasure: 'm³' },
        { Id: 3, ProductName: 'Bê tông mác 200', UnitPrice: 480000, UnitOfMeasure: 'm³' }
      ])
    }
  }

  const fetchStations = async () => {
    try {
      const response = await apiClient.get('/api/orders/stations')
      const list = response.data.map((s: any) => ({
        id: s.Id,
        name: s.StationName,
        code: s.StationCode
      }))
      setStations(list)
    } catch (error) {
      console.error('Lỗi tải trạm:', error)
      setStations([
        { id: 1, name: 'Trạm A', code: 'STA' },
        { id: 2, name: 'Trạm B', code: 'STB' }
      ])
    }
  }
  const fetchCustomers = async () => {

  try {

    const res =
      await apiClient.get(
        '/api/customer-debts'
      )

    setCustomers(res.data || [])

  } catch (err) {

    console.error(
      'Lỗi tải khách hàng:',
      err
    )

  }

}

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }
  const handleCustomerChange = (
  customerName: string
) => {

  setForm(prev => ({
    ...prev,
    customerName
  }))

  const found =
    customers.find(
      c => c.CustomerName === customerName
    ) || null

  setSelectedCustomerDebt(found)

}

  const handleProductChange = (productId: string) => {
    setForm(prev => ({ ...prev, concreteType: productId }))
    const product = products.find(p => p.Id === Number(productId))
    if (product) {
      setForm(prev => ({ ...prev, price: product.UnitPrice.toString() }))
    }
  }

  const selectedStation = stations.find(s => s.id === Number(form.mixingStationId))
  const totalAmount = (Number(form.volume) || 0) * (Number(form.price) || 0)
  const filteredCustomers =
  customers.filter(c =>
    c.CustomerName
      .toLowerCase()
      .includes(
        searchCustomer.toLowerCase()
      )
  )

  const buildNotes = () => {
    return [
      `Tên khách hàng: ${form.customerName}`,
      `Địa chỉ nhận: ${form.address}`,
      `Số điện thoại: ${form.phone}`,
      `Mác bê tông: ${products.find(p => p.Id === Number(form.concreteType))?.ProductName || ''}`,
      `Khối lượng đặt: ${form.volume} m³`,
      `Đơn giá: ${Number(form.price).toLocaleString()} VND`,
      `Thời gian giao: ${form.deliveryTime}`,
      `Trạm trộn: ${selectedStation?.name || ''}`,
      `Xe giao: ${form.truck}`,
      `Kỹ thuật công trình: ${form.technicalEngineer}`,
      `Ôm ống: ${form.pipeOperator}`,
      `Bắt ống: ${form.pipeInstaller}`,
      `Khối lượng đổ: ${form.pouringInstructions}`
    ].join('\n')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.customerName || !form.address || !form.phone || !form.concreteType ||
        !form.volume || !form.price || !form.deliveryTime || !form.mixingStationId) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc')
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.post('/api/orders', {
        mixingStationId: Number(form.mixingStationId),

        customerName: form.customerName,
        address: form.address,
        phone: form.phone,

        notes: buildNotes(),

        items: [{
          productId: Number(form.concreteType),
          quantity: Number(form.volume),
          unitPrice: Number(form.price)
        }]
      })

      setSuccessMessage(`✅ Tạo đơn thành công! Mã đơn: ${response.data.orderCode}`)
      setForm({
        customerName: '',
        address: '',
        phone: '',
        concreteType: '',
        volume: '1',
        price: '0',
        deliveryTime: '',
        technicalEngineer: '',
        pipeOperator: '',
        pipeInstaller: '',
        pouringInstructions: '',
        mixingStationId: '',
        truck: ''
      })
      // show the coordinator orders list so the created order is visible and can be sent to station
      navigate('/coordinator/orders')
    } catch (error: any) {
      alert(`❌ Lỗi: ${error.response?.data?.error || 'Tạo đơn thất bại'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-order-dashboard">
      <div className="page-header">
        <div>
        <h1> Tạo đơn hàng mới</h1>
        <p>Chọn trạm trộn và điền thông tin để đơn chỉ hiển thị đúng trạm.</p>
      </div>
      </div>
      <form onSubmit={handleSubmit} className="order-form">
        {successMessage && <div className="success-banner">{successMessage}</div>}
        <div className="form-section">
          <h3>🏢 Thông tin khách hàng</h3>
          <div className="form-row">
            <div className="form-group">
             <label>Tên khách hàng</label>

<input
  type="text"
  placeholder="🔍 Tìm nhanh khách hàng..."
  className="customer-search-input"
  value={searchCustomer}
  onChange={(e) =>
    setSearchCustomer(
      e.target.value
    )
  }
/>

<select
  name="customerName"
  value={form.customerName}
  onChange={(e) =>
    handleCustomerChange(
      e.target.value
    )
  }
  required
>

  <option value="">
    -- Chọn khách hàng --
  </option>

  {
    filteredCustomers.map(c => (

      <option
        key={c.Id}
        value={c.CustomerName}
      >

        {c.CustomerName}

      </option>

    ))
  }

</select>
{
  selectedCustomerDebt && (

    <div className="debt-warning">

      <div>
        Công nợ hiện tại:
        <strong>
          {' '}
          {selectedCustomerDebt.DebtAmount.toLocaleString()} đ
        </strong>
      </div>

      <div>
        Hạn mức:
        <strong>
          {' '}
          {selectedCustomerDebt.DebtLimit.toLocaleString()} đ
        </strong>
      </div>

    </div>

  )
}
{
  selectedCustomerDebt &&
  (
    selectedCustomerDebt.DebtAmount +
    totalAmount
  ) >
  selectedCustomerDebt.DebtLimit && (

    <div className="credit-alert">

      ⚠️ Đơn hàng này sẽ vượt hạn mức công nợ!

    </div>

  )
}
            </div>
            <div className="form-group">
              <label>Địa chỉ nhận</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Nhập địa chỉ nhận hàng" required />
            </div>
            <div className="form-group">
              <label>Số điện thoại</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Nhập SĐT" required />
            </div>
          </div>
        </div>

        {/* BÊ TÔNG */}
        <div className="form-section">
          <h3>🏗️ Thông tin bê tông</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Tên mác bê tông cần đặt</label>
              <select name="concreteType" value={form.concreteType} onChange={(e) => handleProductChange(e.target.value)} required>
                <option value="">-- Chọn mác bê tông --</option>
                {products.map(p => (
                  <option key={p.Id} value={p.Id}>{p.ProductName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Khối lượng đặt (m³)</label>
              <input type="number" name="volume" min={1} value={form.volume} onChange={handleChange} placeholder="Nhập khối lượng" required />
            </div>
            <div className="form-group">
              <label>Đơn giá (VND)</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} placeholder="Đơn giá VND" required />
            </div>
            <div className="form-group">
              <label>Thời gian giao hàng</label>
              <input type="datetime-local" name="deliveryTime" value={form.deliveryTime} onChange={handleChange} required />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>🚚 Chọn trạm trộn</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Trạm trộn</label>
              <select name="mixingStationId" value={form.mixingStationId} onChange={handleChange} required>
                <option value="">-- Chọn trạm trộn --</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Xe giao</label>
              <input type="text" name="truck" value={form.truck} onChange={handleChange} placeholder="Nhập mã xe" />
            </div>
          </div>
        </div>

        {/* NHÂN SỰ */}
        <div className="form-section">
          <h3>👥 Thông tin nhân sự công trình</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Kỹ thuật công trình là ai?</label>
              <input type="text" name="technicalEngineer" value={form.technicalEngineer} onChange={handleChange} placeholder="Tên kỹ thuật" />
            </div>
            <div className="form-group">
              <label>Ôm ống là ai?</label>
              <input type="text" name="pipeOperator" value={form.pipeOperator} onChange={handleChange} placeholder="Tên ôm ống" />
            </div>
            <div className="form-group">
              <label>Bắt ống là ai?</label>
              <input type="text" name="pipeInstaller" value={form.pipeInstaller} onChange={handleChange} placeholder="Tên bắt ống" />
            </div>
            <div className="form-group">
              <label>Khối lượng đổ như nào?</label>
              <textarea name="pouringInstructions" value={form.pouringInstructions} onChange={handleChange} placeholder="Mô tả cách đổ, tầng, chiều cao..." />
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="form-section summary-card">
          <h3>📊 Tóm tắt đơn hàng</h3>
          <div className="summary-row">
            <span>Khối lượng:</span>
            <strong>{form.volume} m³</strong>
          </div>
          <div className="summary-row">
            <span>Tổng giá trị:</span>
            <strong>{totalAmount.toLocaleString()} VND</strong>
          </div>
          <div className="summary-note">💡 Ghi chú chi tiết sẽ được gửi cùng đơn hàng</div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '⏳ Đang tạo...' : '✅ Tạo đơn'}
          </button>
        </div>
      </form>
    </div>
  )
}