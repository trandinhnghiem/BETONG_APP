const pool = await getPool();
const result = await pool.request().query("SELECT DB_NAME() AS db");
console.log(result.recordset);