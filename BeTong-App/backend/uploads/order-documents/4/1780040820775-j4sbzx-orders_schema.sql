-- ======================================================
-- BẢNG ORDERS - Đầy đủ các cột theo yêu cầu
-- Bao gồm: các cột cũ + cột mới (AdditionalCosts, TransportCompVolume, TransportCompAmount)
-- ======================================================

-- Nếu cần tạo mới bảng (tham khảo), uncomment bên dưới:
/*
CREATE TABLE Orders (
  Id                  INT IDENTITY(1,1) PRIMARY KEY,
  OrderCode           NVARCHAR(100) NOT NULL,
  CoordinatorId       INT NULL,
  SourceStationId     INT NULL,
  DestinationStationId INT NULL,
  OrderDate           DATETIME NULL,
  OrderStatus         NVARCHAR(50) DEFAULT 'Draft',
  ApprovedBy          INT NULL,
  ApprovedAt          DATETIME NULL,
  ApprovalReason      NVARCHAR(MAX) NULL,
  RejectionReason     NVARCHAR(MAX) NULL,
  UploadedAt          DATETIME NULL,
  SentToStationAt     DATETIME NULL,
  StationReceivedAt   DATETIME NULL,
  PaymentStatus       NVARCHAR(50) NULL,
  PaymentConfirmedBy  INT NULL,
  PaymentConfirmedAt  DATETIME NULL,
  PaymentMethod       NVARCHAR(50) NULL,
  PaymentAmount       DECIMAL(18,2) NULL,
  TotalAmount         DECIMAL(18,2) NULL,
  Notes               NVARCHAR(MAX) NULL,
  CreatedAt           DATETIME DEFAULT GETDATE(),
  UpdatedAt           DATETIME DEFAULT GETDATE(),

  -- Thông tin khách hàng
  CustomerName        NVARCHAR(255) NULL,
  Address             NVARCHAR(500) NULL,
  Phone               NVARCHAR(20) NULL,

  -- Thông tin bê tông
  ConcreteType        NVARCHAR(100) NULL,
  Volume              FLOAT NULL,
  Price               DECIMAL(18,2) NULL,
  DeliveryTime        DATETIME NULL,

  -- Thông tin nhân sự
  Engineer            NVARCHAR(255) NULL,
  PipeHolder          NVARCHAR(255) NULL,
  PipeFixer           NVARCHAR(255) NULL,
  PouringVolume       NVARCHAR(255) NULL,

  -- Thông tin trạm & xe
  MixingStation       NVARCHAR(255) NULL,
  Truck               NVARCHAR(100) NULL,

  -- Từ chối & chứng từ
  RejectReason        NVARCHAR(MAX) NULL,
  UploadDocument      NVARCHAR(500) NULL,
  UploadedByEngineerAt DATETIME NULL,
  SentToAccountingAt  DATETIME NULL,
  PaymentRejectReason NVARCHAR(MAX) NULL,

  -- Công nợ
  DebtDueDate         DATETIME NULL,

  -- ✅ MỚI: Chi phí phát sinh
  AdditionalCosts     DECIMAL(18,2) DEFAULT 0,

  -- ✅ MỚI: Bù vận chuyển
  TransportCompVolume  FLOAT DEFAULT 0,    -- Số khối bù vận chuyển
  TransportCompAmount  DECIMAL(18,2) DEFAULT 0  -- Tiền bù vận chuyển
);
*/

-- ======================================================
-- ALTER TABLE: Thêm 3 cột mới vào bảng Orders đã có
-- ======================================================

-- Chi phí phát sinh
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'AdditionalCosts'
)
BEGIN
  ALTER TABLE Orders ADD AdditionalCosts DECIMAL(18,2) DEFAULT 0;
END

-- Số khối bù vận chuyển
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'TransportCompVolume'
)
BEGIN
  ALTER TABLE Orders ADD TransportCompVolume FLOAT DEFAULT 0;
END

-- Tiền bù vận chuyển
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'TransportCompAmount'
)
BEGIN
  ALTER TABLE Orders ADD TransportCompAmount DECIMAL(18,2) DEFAULT 0;
END

-- ======================================================
-- KIỂM TRA: Xem cấu trúc bảng đầy đủ
-- ======================================================
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_NAME = 'Orders'
-- ORDER BY ORDINAL_POSITION;
