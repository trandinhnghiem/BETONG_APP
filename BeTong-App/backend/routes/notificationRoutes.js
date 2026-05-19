const express = require('express')
const router = express.Router()
const sql = require('mssql')

const { getConnection } = require('../config/database')


// ================= GET NOTIFICATIONS =================
router.get('/', async (req, res) => {

  try {

    const { stationId } = req.query

    const pool = await getConnection()

    const result = await pool.request()
      .input('stationId', sql.Int, stationId)
      .query(`
        SELECT *
        FROM Notifications
        WHERE StationId = @stationId
        ORDER BY CreatedAt DESC
      `)

    res.json(result.recordset)

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: err.message
    })

  }

})


// ================= MARK AS READ =================
router.put('/:id/read', async (req, res) => {

  try {

    const pool = await getConnection()

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        UPDATE Notifications
        SET IsRead = 1
        WHERE Id = @id
      `)

    res.json({
      success: true
    })

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: err.message
    })

  }

})

module.exports = router