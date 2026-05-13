import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { Link } from 'react-router-dom'

interface Station {
  id: number
  StationName: string
}

export default function CoordinatorStationsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/api/orders/stations')
        const list = Array.isArray(response.data) ? response.data : []
        setStations(list.map((station: any) => ({
          id: station.Id || station.id,
          StationName: station.StationName || station.Name || 'Trạm'
        })))
      } catch (error) {
        console.error('Lỗi tải danh sách trạm:', error)
        setStations([])
      } finally {
        setLoading(false)
      }
    }

    fetchStations()
  }, [])

  return (
    <div className="page-section" style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1>Quản lý trạm</h1>
        <p>Danh sách các trạm hiện có để điều phối và theo dõi.</p>
      </div>

      {loading ? (
        <div>Đang tải danh sách trạm...</div>
      ) : stations.length === 0 ? (
        <div>Không tìm thấy trạm nào.</div>
      ) : (
        <div style={{ display: 'grid', gap: 14, maxWidth: 900 }}>
          {stations.map((station) => (
            <div key={station.id} style={{ padding: 18, background: '#fff', borderRadius: 14, boxShadow: '0 12px 30px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: 0 }}>{station.StationName}</h3>
              <p style={{ margin: '8px 0 0 0', color: '#607d8b' }}>Trạm ID: {station.id}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Link to="/coordinator" style={{ padding: '12px 18px', borderRadius: 12, background: '#4e73df', color: '#fff', textDecoration: 'none' }}>
          Về dashboard
        </Link>
      </div>
    </div>
  )
}
