const { getConnection } = require('../config/database')

function parseNotes(notes = '') {
  const get = (label) => {
    const regex = new RegExp(`${label}:\\s*(.*)`)
    const match = notes.match(regex)
    return match ? match[1].split('\n')[0].trim() : null
  }

  return {
    customerName: get('Tên khách hàng'),
    address: get('Địa chỉ nhận'),
    phone: get('Số điện thoại')
  }
}

async function run() {
  try {
    const pool = await getConnection()

    // 1. Lấy toàn bộ đơn cũ
    const result = await pool.request().query(`
      SELECT Id, Notes
      FROM Orders
      WHERE Notes IS NOT NULL
    `)

    const orders = result.recordset

    console.log(`Found ${orders.length} orders`)

    // 2. Loop từng đơn để update
    for (const order of orders) {
      const parsed = parseNotes(order.Notes)

      await pool.request()
        .input('Id', order.Id)
        .input('CustomerName', parsed.customerName)
        .input('Address', parsed.address)
        .input('Phone', parsed.phone)
        .query(`
          UPDATE Orders
          SET 
            CustomerName = @CustomerName,
            Address = @Address,
            Phone = @Phone
          WHERE Id = @Id
        `)

      console.log(`✔ Updated order ID: ${order.Id}`)
    }

    console.log('🎉 MIGRATION DONE SUCCESSFULLY')

  } catch (err) {
    console.error('❌ Migration error:', err)
  }
}

run()