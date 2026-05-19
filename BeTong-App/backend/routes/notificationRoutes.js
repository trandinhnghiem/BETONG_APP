const express = require('express')

const router = express.Router()

const {
  getConnection,
  sql
} = require('../config/database')

// ===============================
// GET NOTIFICATIONS
// ===============================
router.get('/', async (req, res) => {

  try {

    const stationId =
      req.query.stationId

    if (!stationId) {

      return res.status(400).json({
        error: 'stationId required'
      })

    }

    const pool =
      await getConnection()

    const result =
      await pool.request()
        .input(
          'StationId',
          sql.Int,
          stationId
        )
        .query(`
          SELECT
            *
          FROM Notifications
          WHERE StationId = @StationId
          ORDER BY CreatedAt DESC
        `)

    res.json(result.recordset)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

})

// ===============================
// MARK AS READ
// ===============================
router.put('/:id/read', async (req, res) => {

  try {

    const id =
      parseInt(req.params.id)

    const pool =
      await getConnection()

    await pool.request()
      .input('Id', sql.Int, id)
      .query(`
        UPDATE Notifications
        SET IsRead = 1
        WHERE Id = @Id
      `)

    res.json({
      message: 'Đã đọc'
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      error: error.message
    })

  }

})

module.exports = router