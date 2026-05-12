import { useState } from 'react'
import apiClient from '../../services/api'
import './CreateOrderPage.css'

export default function CoordinatorCreateOrderPage() {
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    customerName: '',
    address: '',
    phone: '',
    concreteType: '',
    volume: '',
    price: '',
    deliveryTime: '',
    engineer: '',
    pipeHolder: '',
    pipeFixer: '',
    pouringVolume: '',
    mixingStation: '',
    truck: '',
    sourceStation: '',
    destinationStation: '',
    notes: ''
  })

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    try {
      setLoading(true)

      const res = await apiClient.post('/api/orders', form)

      alert('Tạo đơn thành công!')
      console.log(res.data)

    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="coordinator-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Tạo đơn bê tông</h1>
          <p>Nhập thông tin đơn hàng</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="order-form modern">

        {/* KHÁCH */}
        <div className="dashboard-card">
          <h2>Khách hàng</h2>
          <div className="form-grid">
            <input name="customerName" placeholder="Tên khách" onChange={handleChange}/>
            <input name="phone" placeholder="SĐT" onChange={handleChange}/>
            <input name="address" placeholder="Địa chỉ" className="full" onChange={handleChange}/>
          </div>
        </div>

        {/* ĐƠN */}
        <div className="dashboard-card">
          <h2>Đơn hàng</h2>
          <div className="form-grid">
            <input name="concreteType" placeholder="Mác bê tông" onChange={handleChange}/>
            <input name="volume" placeholder="Khối lượng" onChange={handleChange}/>
            <input name="price" placeholder="Đơn giá" onChange={handleChange}/>
            <input name="deliveryTime" type="datetime-local" onChange={handleChange}/>
          </div>
        </div>

        {/* NHÂN SỰ */}
        <div className="dashboard-card">
          <h2>Nhân sự</h2>
          <div className="form-grid">
            <input name="engineer" placeholder="Kỹ thuật" onChange={handleChange}/>
            <input name="pipeHolder" placeholder="Ôm ống" onChange={handleChange}/>
            <input name="pipeFixer" placeholder="Bắt ống" onChange={handleChange}/>
          </div>
        </div>

        {/* VẬN HÀNH */}
        <div className="dashboard-card">
          <h2>Vận hành</h2>
          <div className="form-grid">
            <input name="pouringVolume" placeholder="Khối lượng đổ" onChange={handleChange}/>
            <input name="mixingStation" placeholder="Trạm trộn" onChange={handleChange}/>
            <input name="truck" placeholder="Xe" onChange={handleChange}/>
          </div>
        </div>

        <button className="action-btn primary">
          {loading ? 'Đang tạo...' : 'Tạo đơn'}
        </button>

      </form>
    </div>
  )
}