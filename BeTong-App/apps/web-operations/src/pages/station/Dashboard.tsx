import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import './StationDashboard.css'

interface StationStat {
  name: string
  count: number
}

export default function StationDashboard() {
  const [stations, setStations] = useState<StationStat[]>([])
  const [loading, setLoading] = useState(true)

  // 4 trạm cố định
  const stationList = [
    'Trạm Ô Môn 1',
    'Trạm Ô Môn 2',
    'Trạm T82',
    'Trạm Hậu Giang'
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const res = await apiClient.get('/api/orders/station-orders')
      const orders = res.data || []

      const result = stationList.map(name => {
        const count = orders.filter((o: any) =>
          o.DestinationStation === name && o.OrderStatus === 'Sent'
        ).length

        return { name, count }
      })

      setStations(result)

    } catch (err) {
      console.error(err)
      setStations([])
    } finally {
      setLoading(false)
    }
  }

  const goToStation = (name: string) => {
    window.location.href = `/station-orders?station=${encodeURIComponent(name)}`
  }

  return (
    <div className="station-dashboard">

      <h1>🏭 Dashboard Trạm</h1>
      <p>Các đơn hàng đang chờ xác nhận tại từng trạm</p>

      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <div className="station-grid">
          {stations.map(st => (
            <div
              key={st.name}
              className="station-card"
              onClick={() => goToStation(st.name)}
            >
              <h2>{st.name}</h2>
              <p>{st.count} đơn chờ xử lý</p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}