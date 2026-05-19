import { useEffect, useState } from 'react'

import {
  FiMapPin,
  FiTruck,
  FiClock,
  FiCheckCircle,
  FiDollarSign,
  FiTrendingUp
} from 'react-icons/fi'

import apiClient from '../../services/api'

import './StationsPage.css'

interface Station {
  Id: number
  StationName: string
  TotalOrders: number
  Revenue: number
  PendingOrders: number
  CompletedOrders: number
}

export default function AccountingStationsPage() {

  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStations()
  }, [])

  const fetchStations = async () => {

    try {

      setLoading(true)

      // Try to fetch orders visible to Accounting first
      let response = await apiClient.get('/api/orders/accounting-orders')
      let orders = Array.isArray(response.data) ? response.data : []

      // fallback to export (all orders) if accounting endpoint returns empty
      if (!orders.length) {
        response = await apiClient.get('/api/orders/export')
        orders = Array.isArray(response.data) ? response.data : []
      }

      const map: any = {}

      orders.forEach((o: any) => {
        const stationName = o.DestinationStation || o.DestinationStation || 'Không xác định'

        if (!map[stationName]) {
          map[stationName] = {
            Id: Object.keys(map).length + 1,
            StationName: stationName,
            TotalOrders: 0,
            Revenue: 0,
            PendingOrders: 0,
            CompletedOrders: 0
          }
        }

        map[stationName].TotalOrders += 1

        if (o.OrderStatus === 'Completed') {
          map[stationName].CompletedOrders += 1
          map[stationName].Revenue += o.TotalAmount || 0
        }

        if (o.OrderStatus === 'Pending Approval') {
          map[stationName].PendingOrders += 1
        }
      })

      setStations(Object.values(map))

    } catch (error) {

      console.error(error)

      setStations([])

    } finally {

      setLoading(false)
    }
  }

  const totalRevenue = stations.reduce(
    (s, i) => s + (i.Revenue || 0),
    0
  )

  const totalOrders = stations.reduce(
    (s, i) => s + (i.TotalOrders || 0),
    0
  )

  if (loading) {
    return (
      <div className="stations-loading">
        Đang tải dữ liệu trạm...
      </div>
    )
  }

  return (

    <div className="stations-page">

      {/* HEADER */}

      <div className="stations-hero">

        <div>

          <h1>Quản lý trạm</h1>

          <p>
            Theo dõi hiệu suất hoạt động
            và doanh thu toàn hệ thống
          </p>

        </div>

      </div>

      {/* KPI */}

      <div className="stations-kpi-grid">

        <div className="stations-kpi-card red">

          <div className="stations-kpi-icon">
            <FiMapPin />
          </div>

          <div>

            <h3>{stations.length}</h3>

            <p>Trạm hoạt động</p>

          </div>

        </div>

        <div className="stations-kpi-card blue">

          <div className="stations-kpi-icon">
            <FiTruck />
          </div>

          <div>

            <h3>{totalOrders}</h3>

            <p>Tổng đơn hàng</p>

          </div>

        </div>

        <div className="stations-kpi-card green">

          <div className="stations-kpi-icon">
            <FiDollarSign />
          </div>

          <div>

            <h3>
              {totalRevenue.toLocaleString()} đ
            </h3>

            <p>Doanh thu hoàn thành</p>

          </div>

        </div>

        <div className="stations-kpi-card purple">

          <div className="stations-kpi-icon">
            <FiTrendingUp />
          </div>

          <div>

            <h3>
              {
                stations.filter(
                  s => s.CompletedOrders > 0
                ).length
              }
            </h3>

            <p>Trạm có doanh thu</p>

          </div>

        </div>

      </div>

      {/* GRID */}

      <div className="stations-grid">

        {stations.map((station, index) => {

          const progress =
            station.TotalOrders > 0
              ? (
                  station.CompletedOrders /
                  station.TotalOrders
                ) * 100
              : 0

          return (

            <div
              key={station.Id}
              className="station-card"
            >

              <div className="station-card-top">

                <div>

                  <span className="station-rank">
                    #{index + 1}
                  </span>

                  <h2>
                    {station.StationName}
                  </h2>

                </div>

                <div className="station-icon">
                  <FiMapPin />
                </div>

              </div>

              <div className="station-stats">

                <div className="station-stat">

                  <FiTruck />

                  <span>
                    {station.TotalOrders} đơn
                  </span>

                </div>

                <div className="station-stat">

                  <FiClock />

                  <span>
                    {station.PendingOrders} chờ duyệt
                  </span>

                </div>

                <div className="station-stat">

                  <FiCheckCircle />

                  <span>
                    {station.CompletedOrders} hoàn thành
                  </span>

                </div>

              </div>

              <div className="station-progress">

                <div className="progress-info">

                  <span>Tỷ lệ hoàn thành</span>

                  <span>
                    {progress.toFixed(0)}%
                  </span>

                </div>

                <div className="progress-bar">

                  <div
                    className="progress-fill"
                    style={{
                      width: `${progress}%`
                    }}
                  />

                </div>

              </div>

              <div className="station-revenue">

                {(station.Revenue || 0)
                  .toLocaleString()} đ

              </div>

            </div>
          )
        })}

      </div>

    </div>
  )
}
