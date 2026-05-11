import { useState, useEffect } from 'react'
import { FiPlus, FiMinus, FiSave, FiX } from 'react-icons/fi'
import apiClient from '../../services/api'
import './CreateOrderPage.css'

interface Product {
  Id: number
  ProductName: string
  UnitOfMeasure: string
  UnitPrice: number
}

interface Station {
  id: number
  name: string
  code: string
}

interface OrderItem {
  productId: number
  productName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
}

export default function CoordinatorCreateOrderPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sourceStation, setSourceStation] = useState('')
  const [destinationStation, setDestinationStation] = useState('')
  const [notes, setNotes] = useState('')
  const [stations, setStations] = useState<Station[]>([])

  useEffect(() => {
    fetchProducts()
    fetchStations()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/api/orders/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Lỗi khi tải sản phẩm:', error)
      setProducts([
        { Id: 1, ProductName: 'Xi măng loại A', UnitOfMeasure: 'bao', UnitPrice: 50000 },
        { Id: 2, ProductName: 'Cát', UnitOfMeasure: 'm³', UnitPrice: 150000 },
        { Id: 3, ProductName: 'Đá', UnitOfMeasure: 'm³', UnitPrice: 200000 },
        { Id: 4, ProductName: 'Thép', UnitOfMeasure: 'kg', UnitPrice: 8000 },
        { Id: 5, ProductName: 'Gạch', UnitOfMeasure: 'viên', UnitPrice: 1200 }
      ])
    }
  }

  const fetchStations = async () => {
    try {
      const response = await apiClient.get('/api/orders/stations')
      const stations = response.data.map((s: any) => ({
        id: s.Id,
        name: s.StationName,
        code: s.StationCode
      }))
      setStations(stations)
    } catch (error) {
      console.error('Lỗi khi tải trạm:', error)
      setStations([
        { id: 1, name: 'Trạm A', code: 'STA' },
        { id: 2, name: 'Trạm B', code: 'STB' }
      ])
    }
  }

  const addOrderItem = (product: Product) => {
    const existingItem = orderItems.find(i => i.productId === product.Id)
    if (existingItem) {
      updateOrderItem(product.Id, existingItem.quantity + 1)
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: product.Id,
          productName: product.ProductName,
          quantity: 1,
          unit: product.UnitOfMeasure,
          unitPrice: product.UnitPrice,
          totalPrice: product.UnitPrice
        }
      ])
    }
  }

  const updateOrderItem = (productId: number, quantity: number) => {
    if (quantity <= 0) return removeOrderItem(productId)

    setOrderItems(orderItems.map(item =>
      item.productId === productId
        ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
        : item
    ))
  }

  const removeOrderItem = (productId: number) => {
    setOrderItems(orderItems.filter(i => i.productId !== productId))
  }

  const getTotalAmount = () =>
    orderItems.reduce((sum, i) => sum + i.totalPrice, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sourceStation || !destinationStation || orderItems.length === 0) {
      alert('Vui lòng nhập đầy đủ thông tin và chọn ít nhất 1 sản phẩm')
      return
    }

    if (sourceStation === destinationStation) {
      alert('Trạm gửi và trạm nhận không được giống nhau')
      return
    }

    try {
      setLoading(true)

      const res = await apiClient.post('/api/orders', {
        sourceStation: parseInt(sourceStation),
        destinationStation: parseInt(destinationStation),
        notes,
        items: orderItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      })

      alert(`Tạo đơn thành công! Mã đơn: ${res.data.orderCode}`)

      setSourceStation('')
      setDestinationStation('')
      setNotes('')
      setOrderItems([])
    } catch (error: any) {
      alert(error.response?.data?.error || 'Tạo đơn thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-order-page">
      <div className="page-header">
        <h1>Tạo đơn hàng mới</h1>
        <p>Yêu cầu vật tư cho trạm của bạn</p>
      </div>

      <form onSubmit={handleSubmit} className="order-form">

        {/* TRẠM */}
        <div className="form-section">
          <h3>Thông tin trạm</h3>

          <select value={sourceStation} onChange={e => setSourceStation(e.target.value)}>
            <option value="">Chọn trạm gửi</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          <select value={destinationStation} onChange={e => setDestinationStation(e.target.value)}>
            <option value="">Chọn trạm nhận</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {/* SẢN PHẨM */}
        <div className="form-section">
          <h3>Sản phẩm</h3>

          {products.map(p => (
            <div key={p.Id}>
              {p.ProductName} - {p.UnitPrice.toLocaleString()} VND/{p.UnitOfMeasure}
              <button type="button" onClick={() => addOrderItem(p)}>
                Thêm
              </button>
            </div>
          ))}
        </div>

        {/* DANH SÁCH */}
        {orderItems.length > 0 && (
          <div className="form-section">
            <h3>Danh sách đặt</h3>

            {orderItems.map(i => (
              <div key={i.productId}>
                {i.productName} - {i.quantity} {i.unit}

                <button onClick={() => updateOrderItem(i.productId, i.quantity - 1)}>
                  <FiMinus />
                </button>

                <button onClick={() => updateOrderItem(i.productId, i.quantity + 1)}>
                  <FiPlus />
                </button>

                <button onClick={() => removeOrderItem(i.productId)}>
                  <FiX />
                </button>
              </div>
            ))}

            <strong>
              Tổng tiền: {getTotalAmount().toLocaleString()} VND
            </strong>
          </div>
        )}

        {/* GHI CHÚ */}
        <textarea
          placeholder="Ghi chú thêm..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <button disabled={loading}>
          {loading ? 'Đang tạo đơn...' : 'Tạo đơn'}
        </button>
      </form>
    </div>
  )
}