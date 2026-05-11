IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
  CREATE TABLE Orders (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CustomerName NVARCHAR(200) NOT NULL,
    DeliveryAddress NVARCHAR(500) NOT NULL,
    CustomerPhone VARCHAR(50) NOT NULL,
    CementProductId INT NULL,
    CementProductName NVARCHAR(500) NULL,
    Quantity DECIMAL(18, 2) NOT NULL DEFAULT 0,
    UnitPrice DECIMAL(18, 2) NOT NULL DEFAULT 0,
    DeliveryTime DATETIME NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'pending',
    IsProject BIT NOT NULL DEFAULT 0,
    DebtSettlementRequired BIT NOT NULL DEFAULT 0,
    DebtSettled BIT NOT NULL DEFAULT 0,
    ApprovedBy INT NULL,
    ApprovedAt DATETIME NULL,
    DispatchAssignedBy INT NULL,
    DispatchAssignedAt DATETIME NULL,
    ProductionScheduleLink NVARCHAR(500) NULL,
    TechnicalEngineer NVARCHAR(200) NULL,
    PipeOperator NVARCHAR(200) NULL,
    FittingOperator NVARCHAR(200) NULL,
    PourVolumeDetails NVARCHAR(1000) NULL,
    MixingPlant NVARCHAR(200) NULL,
    TruckAssigned NVARCHAR(200) NULL,
    DeliveredQuantity DECIMAL(18, 2) NULL,
    DeliveryConfirmedByCustomer BIT NOT NULL DEFAULT 0,
    AcceptanceDocumentUrl NVARCHAR(500) NULL,
    InvoiceAmount DECIMAL(18, 2) NULL,
    PaymentStatus VARCHAR(50) NOT NULL DEFAULT 'pending',
    Notes NVARCHAR(1000) NULL,
    ViberReceiverId NVARCHAR(200) NULL,
    ViberNotifiedAt DATETIME NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
  );

  ALTER TABLE Orders ADD CONSTRAINT FK_Orders_CementProducts FOREIGN KEY (CementProductId) REFERENCES CementProducts(Id);
  ALTER TABLE Orders ADD CONSTRAINT FK_Orders_ApprovedBy_Users FOREIGN KEY (ApprovedBy) REFERENCES Users(Id);
  ALTER TABLE Orders ADD CONSTRAINT FK_Orders_DispatchAssignedBy_Users FOREIGN KEY (DispatchAssignedBy) REFERENCES Users(Id);
END
