const { getConnection, sql } = require('../config/database');

/**
 * Cleanup import history older than 2 days
 * This function should be called periodically (e.g., via cron job or scheduled task)
 */
async function cleanupImportHistory() {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Delete import history older than 2 days
    const result = await request.query(`
      IF OBJECT_ID('ImportHistory', 'U') IS NOT NULL
      BEGIN
        DELETE FROM ImportHistory
        WHERE CreatedAt < DATEADD(DAY, -2, GETDATE())
      END
    `);
    
    const deletedCount = result.rowsAffected[0] || 0;
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} import history records older than 2 days`);
    }
    
    return deletedCount;
  } catch (error) {
    console.warn('⚠️  Error cleaning up import history (table may not exist yet):', error.message);
    // Don't throw - this shouldn't crash the server if cleanup fails
    return 0;
  }
}

module.exports = {
  cleanupImportHistory,
};

