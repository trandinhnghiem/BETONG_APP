const { getConnection, sql } =
  require('../config/database')

class VehicleModel {

  // =========================
  // GET ALL
  // =========================

  static async findAll() {

    const pool =
      await getConnection()

    const result =
      await pool.request()

      .query(`

        SELECT

          v.Id,
          v.LicensePlate,
          v.DriverName,
          v.DriverPhone,
          v.Capacity,
          v.IsActive,

          CASE

            WHEN EXISTS (

              SELECT 1
              FROM Orders o

              WHERE
                o.Truck = v.LicensePlate

                AND o.OrderStatus IN (
                  'Processing',
                  'Delivering'
                )

            )

            THEN N'Đang giao'

            WHEN v.IsActive = 0

            THEN N'Ngưng hoạt động'

            ELSE N'Sẵn sàng'

          END AS VehicleStatus

        FROM Vehicles v

        ORDER BY v.CreatedAt DESC

      `)

    return result.recordset

  }

  // =========================
  // CREATE
  // =========================

  static async create(data) {

    const pool =
      await getConnection()

    await pool.request()

      .input(
        'LicensePlate',
        sql.NVarChar,
        data.licensePlate
      )

      .input(
        'DriverName',
        sql.NVarChar,
        data.driverName
      )

      .input(
        'DriverPhone',
        sql.NVarChar,
        data.driverPhone
      )

      .input(
        'Capacity',
        sql.Float,
        data.capacity
      )

      .query(`

        INSERT INTO Vehicles (

          LicensePlate,
          DriverName,
          DriverPhone,
          Capacity

        )

        VALUES (

          @LicensePlate,
          @DriverName,
          @DriverPhone,
          @Capacity

        )

      `)

    return true

  }

  // =========================
// BULK INSERT
// =========================

static async bulkInsert(
  vehicles
) {

  const pool =
    await getConnection()

  for (const v of vehicles) {

    await pool.request()

      .input(
        'LicensePlate',
        sql.NVarChar,
        v.LicensePlate
      )

      .input(
        'DriverName',
        sql.NVarChar,
        v.DriverName
      )

      .input(
        'DriverPhone',
        sql.NVarChar,
        v.DriverPhone
      )

      .input(
        'Capacity',
        sql.Float,
        v.Capacity
      )

      .query(`

        INSERT INTO Vehicles (

          LicensePlate,
          DriverName,
          DriverPhone,
          Capacity

        )

        VALUES (

          @LicensePlate,
          @DriverName,
          @DriverPhone,
          @Capacity

        )

      `)

  }

  return true

}

static async findByLicensePlate(
  licensePlate
) {

  const pool =
    await getConnection()

  const result =
    await pool.request()

      .input(
        'LicensePlate',
        sql.NVarChar,
        licensePlate
      )

      .query(`

        SELECT

          v.*,

          CASE

            WHEN EXISTS (

              SELECT 1
              FROM Orders o

              WHERE
                o.Truck = v.LicensePlate

                AND o.OrderStatus IN (
                  'Processing',
                  'Delivering'
                )

            )

            THEN N'Đang giao'

            WHEN v.IsActive = 0

            THEN N'Ngưng hoạt động'

            ELSE N'Sẵn sàng'

          END AS VehicleStatus

        FROM Vehicles v

        WHERE v.LicensePlate =
          @LicensePlate

      `)

  return result.recordset[0]

}

}

module.exports =
  VehicleModel