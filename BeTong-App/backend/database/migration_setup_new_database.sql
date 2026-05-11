-- ========================================
-- Setup Database Mới cho Audit App
-- ========================================
-- Tạo database mới tên: AuditVLX_New
-- Chạy script này trong SSMS để tạo database và tất cả bảng

-- Bước 1: Tạo Database Mới
IF DB_ID('AuditVLX_New') IS NOT NULL
BEGIN
    ALTER DATABASE AuditVLX_New SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE AuditVLX_New;
END

CREATE DATABASE AuditVLX_New;
GO

-- Bước 2: Sử dụng database vừa tạo
USE AuditVLX_New;
GO

-- ========================================
-- Tạo Bảng Territories
-- ========================================
CREATE TABLE Territories (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TerritoryName NVARCHAR(200) UNIQUE NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
);

-- ========================================
-- Tạo Bảng Users
-- ========================================
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserCode VARCHAR(50) UNIQUE NOT NULL,
    Username NVARCHAR(100) UNIQUE NOT NULL,
    Password NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(200) NOT NULL,
    Email NVARCHAR(200),
    Phone VARCHAR(20),
    Role VARCHAR(50) NOT NULL DEFAULT 'user',
    Position NVARCHAR(200),
    Avatar NVARCHAR(500),
    IsChangePassword BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
);

-- ========================================
-- Tạo Bảng CementProducts
-- ========================================
CREATE TABLE CementProducts (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ProductCode VARCHAR(50) UNIQUE NOT NULL,
    ProductName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500),
    UnitPrice DECIMAL(18, 2) NOT NULL DEFAULT 0,
    Stock DECIMAL(18, 2) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
);

-- ========================================
-- Tạo Bảng Stores
-- ========================================
CREATE TABLE Stores (
    Id INT PRIMARY KEY IDENTITY(1,1),
    StoreCode VARCHAR(50) UNIQUE NOT NULL,
    StoreName NVARCHAR(200) NOT NULL,
    Address NVARCHAR(500),
    Phone VARCHAR(20),
    Email NVARCHAR(200),
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    TerritoryId INT NULL,
    UserId INT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'not_audited',
    Rank INT NULL,
    TaxCode VARCHAR(50),
    PartnerName NVARCHAR(200),
    Link NVARCHAR(500),
    FailedReason NVARCHAR(1000),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Stores_Territories FOREIGN KEY (TerritoryId) REFERENCES Territories(Id),
    CONSTRAINT FK_Stores_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT CK_Stores_Status CHECK (Status IN ('not_audited', 'audited', 'passed', 'failed')),
    CONSTRAINT CK_Stores_Rank CHECK (Rank IS NULL OR Rank IN (1, 2))
);

-- ========================================
-- Tạo Bảng Audits
-- ========================================
CREATE TABLE Audits (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    StoreId INT NOT NULL,
    Result VARCHAR(20) NOT NULL CHECK (Result IN ('pass', 'fail')),
    Notes NVARCHAR(1000),
    AuditDate DATETIME NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Audits_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Audits_Stores FOREIGN KEY (StoreId) REFERENCES Stores(Id) ON DELETE CASCADE
);

-- ========================================
-- Tạo Bảng Images
-- ========================================
CREATE TABLE Images (
    Id INT PRIMARY KEY IDENTITY(1,1),
    AuditId INT NOT NULL,
    ImageUrl NVARCHAR(500) NOT NULL,
    ReferenceImageUrl NVARCHAR(500),
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    CapturedAt DATETIME NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Images_Audits FOREIGN KEY (AuditId) REFERENCES Audits(Id) ON DELETE CASCADE
);

-- ========================================
-- Tạo Bảng StoreUsers
-- ========================================
CREATE TABLE StoreUsers (
    Id INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    UserId INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_StoreUsers_Stores FOREIGN KEY (StoreId) REFERENCES Stores(Id) ON DELETE CASCADE,
    CONSTRAINT FK_StoreUsers_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_StoreUsers_StoreId_UserId UNIQUE (StoreId, UserId)
);

-- ========================================
-- Tạo Bảng ImportHistory
-- ========================================
CREATE TABLE ImportHistory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Type VARCHAR(50) NOT NULL,
    Total INT NOT NULL,
    SuccessCount INT NOT NULL,
    ErrorCount INT NOT NULL,
    UserId INT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_ImportHistory_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL,
    CONSTRAINT CK_ImportHistory_Type CHECK (Type IN ('stores', 'users'))
);

-- ========================================
-- Tạo Bảng Orders (cho workflow)
-- ========================================
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
    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Orders_CementProducts FOREIGN KEY (CementProductId) REFERENCES CementProducts(Id),
    CONSTRAINT FK_Orders_ApprovedBy_Users FOREIGN KEY (ApprovedBy) REFERENCES Users(Id),
    CONSTRAINT FK_Orders_DispatchAssignedBy_Users FOREIGN KEY (DispatchAssignedBy) REFERENCES Users(Id)
);

-- ========================================
-- Tạo Indexes cho hiệu năng
-- ========================================
CREATE INDEX IX_Users_Username ON Users(Username);
CREATE INDEX IX_Users_UserCode ON Users(UserCode);
CREATE INDEX IX_Users_Role ON Users(Role);

CREATE INDEX IX_Stores_StoreCode ON Stores(StoreCode);
CREATE INDEX IX_Stores_TerritoryId ON Stores(TerritoryId);
CREATE INDEX IX_Stores_UserId ON Stores(UserId);
CREATE INDEX IX_Stores_Status ON Stores(Status);
CREATE INDEX IX_Stores_TerritoryId_UserId_Status ON Stores(TerritoryId, UserId, Status);

CREATE INDEX IX_Audits_UserId ON Audits(UserId);
CREATE INDEX IX_Audits_StoreId ON Audits(StoreId);
CREATE INDEX IX_Audits_UserId_StoreId ON Audits(UserId, StoreId);
CREATE INDEX IX_Audits_AuditDate ON Audits(AuditDate);

CREATE INDEX IX_Images_AuditId ON Images(AuditId);
CREATE INDEX IX_Images_ImageUrl ON Images(ImageUrl) WHERE ImageUrl IS NOT NULL;

CREATE INDEX IX_StoreUsers_StoreId ON StoreUsers(StoreId);
CREATE INDEX IX_StoreUsers_UserId ON StoreUsers(UserId);
CREATE INDEX IX_StoreUsers_StoreId_UserId ON StoreUsers(StoreId, UserId);

CREATE INDEX IX_ImportHistory_Type ON ImportHistory(Type);

CREATE INDEX IX_Orders_Status ON Orders(Status);
CREATE INDEX IX_Orders_CementProductId ON Orders(CementProductId);
CREATE INDEX IX_Orders_ApprovedBy ON Orders(ApprovedBy);

-- ========================================
-- Hoàn thành
-- ========================================
PRINT 'Database AuditVLX_New đã được tạo thành công!';
PRINT 'Tất cả bảng và indexes đã được tạo.';
GO
