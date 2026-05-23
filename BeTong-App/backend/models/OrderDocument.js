const { getConnection, sql } = require('../config/database')

class OrderDocumentModel {
  static async ensureTable() {
    const pool = await getConnection()

    await pool.request().query(`
      IF OBJECT_ID('dbo.OrderDocuments', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.OrderDocuments (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          OrderId INT NOT NULL,
          FileName NVARCHAR(255) NOT NULL,
          OriginalFileName NVARCHAR(255) NOT NULL,
          MimeType NVARCHAR(100) NOT NULL,
          FileSize BIGINT NOT NULL,
          Url NVARCHAR(500) NOT NULL,
          Path NVARCHAR(500) NOT NULL,
          UploadedBy INT NULL,
          UploadedAt DATETIME NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_OrderDocuments_Orders FOREIGN KEY (OrderId) REFERENCES Orders(Id)
        )

        CREATE INDEX IX_OrderDocuments_OrderId ON dbo.OrderDocuments(OrderId)
      END
    `)
  }

  static async create(orderId, document, uploadedBy = null) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('FileName', sql.NVarChar(255), document.fileName)
      .input('OriginalFileName', sql.NVarChar(255), document.originalName)
      .input('MimeType', sql.NVarChar(100), document.mimeType)
      .input('FileSize', sql.BigInt, document.size)
      .input('Url', sql.NVarChar(500), document.url)
      .input('Path', sql.NVarChar(500), document.path)
      .input('UploadedBy', sql.Int, uploadedBy)
      .query(`
        INSERT INTO OrderDocuments (
          OrderId,
          FileName,
          OriginalFileName,
          MimeType,
          FileSize,
          Url,
          Path,
          UploadedBy,
          UploadedAt
        )
        VALUES (
          @OrderId,
          @FileName,
          @OriginalFileName,
          @MimeType,
          @FileSize,
          @Url,
          @Path,
          @UploadedBy,
          GETDATE()
        )

        SELECT CAST(SCOPE_IDENTITY() AS INT) AS Id
      `)

    return result.recordset[0].Id
  }

  static async findByOrderId(orderId) {
    const pool = await getConnection()

    const result = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .query(`
        SELECT
          Id,
          OrderId,
          FileName,
          OriginalFileName,
          MimeType,
          FileSize,
          Url,
          Path,
          UploadedBy,
          UploadedAt
        FROM OrderDocuments
        WHERE OrderId = @OrderId
        ORDER BY UploadedAt DESC
      `)

    return result.recordset
  }
}

module.exports = OrderDocumentModel
