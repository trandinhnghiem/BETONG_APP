-- Migration: Create new schema for rewritten audit app
-- Date: 2026-05-09

-- Drop existing tables if exists (for fresh start)
IF OBJECT_ID('DownloadLogs', 'U') IS NOT NULL DROP TABLE DownloadLogs;
IF OBJECT_ID('Reports', 'U') IS NOT NULL DROP TABLE Reports;
IF OBJECT_ID('OrderHistory', 'U') IS NOT NULL DROP TABLE OrderHistory;
IF OBJECT_ID('Notifications', 'U') IS NOT NULL DROP TABLE Notifications;
IF OBJECT_ID('OrderItems', 'U') IS NOT NULL DROP TABLE OrderItems;
IF OBJECT_ID('Orders', 'U') IS NOT NULL DROP TABLE Orders;
IF OBJECT_ID('Stations', 'U') IS NOT NULL DROP TABLE Stations;
IF OBJECT_ID('RolePermissions', 'U') IS NOT NULL DROP TABLE RolePermissions;
IF OBJECT_ID('Products', 'U') IS NOT NULL DROP TABLE Products;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;

-- ========== USERS TABLE ==========
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(100) UNIQUE NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    FullName NVARCHAR(255) NOT NULL,
    Phone NVARCHAR(20),
    Role NVARCHAR(50) NOT NULL, -- 'Admin', 'Accounting', 'Coordinator', 'Station', 'Leader'
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- ========== ROLE PERMISSIONS TABLE ==========
CREATE TABLE RolePermissions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Role NVARCHAR(50) NOT NULL,
    Permission NVARCHAR(100) NOT NULL,
    UNIQUE(Role, Permission)
);

-- ========== PRODUCTS TABLE ==========
CREATE TABLE Products (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ProductCode NVARCHAR(50) UNIQUE NOT NULL,
    ProductName NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX),
    Category NVARCHAR(100),
    UnitOfMeasure NVARCHAR(20),
    UnitPrice DECIMAL(18, 2),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- ========== STATIONS TABLE ==========
CREATE TABLE Stations (
    Id INT PRIMARY KEY IDENTITY(1,1),
    StationCode NVARCHAR(50) UNIQUE NOT NULL,
    StationName NVARCHAR(255) NOT NULL,
    Address NVARCHAR(MAX),
    Phone NVARCHAR(20),
    Manager NVARCHAR(255),
    Status NVARCHAR(50) DEFAULT 'Active', -- 'Active', 'Inactive'
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- ========== ORDERS TABLE ==========
CREATE TABLE Orders (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrderCode NVARCHAR(50) UNIQUE NOT NULL,
    CoordinatorId INT NOT NULL,
    SourceStationId INT NOT NULL,
    DestinationStationId INT NOT NULL,
    OrderDate DATETIME DEFAULT GETDATE(),
    
    -- Status: Draft -> Pending Approval -> Approved -> Uploading -> Sent -> Delivered -> Completed
    OrderStatus NVARCHAR(50) DEFAULT 'Draft',
    
    -- Approval by Accounting
    ApprovedBy INT,
    ApprovedAt DATETIME NULL,
    ApprovalReason NVARCHAR(MAX),
    RejectionReason NVARCHAR(MAX),
    
    -- Uploading and sending
    UploadedAt DATETIME NULL,
    SentToStationAt DATETIME NULL,
    StationReceivedAt DATETIME NULL,
    
    -- Payment
    PaymentStatus NVARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Completed'
    PaymentConfirmedBy INT,
    PaymentConfirmedAt DATETIME NULL,
    PaymentMethod NVARCHAR(100),
    PaymentAmount DECIMAL(18, 2),
    
    TotalAmount DECIMAL(18, 2),
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (CoordinatorId) REFERENCES Users(Id),
    FOREIGN KEY (ApprovedBy) REFERENCES Users(Id),
    FOREIGN KEY (PaymentConfirmedBy) REFERENCES Users(Id),
    FOREIGN KEY (SourceStationId) REFERENCES Stations(Id),
    FOREIGN KEY (DestinationStationId) REFERENCES Stations(Id)
);

-- ========== ORDER ITEMS TABLE ==========
CREATE TABLE OrderItems (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrderId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity DECIMAL(10, 2) NOT NULL,
    UnitPrice DECIMAL(18, 2) NOT NULL,
    TotalPrice DECIMAL(18, 2),
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

-- ========== NOTIFICATIONS TABLE ==========
CREATE TABLE Notifications (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ReceiverId INT NOT NULL,
    NotificationType NVARCHAR(100), -- 'OrderApproved', 'OrderRejected', 'PaymentConfirmed', 'StationReceived'
    Title NVARCHAR(255) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    RelatedOrderId INT NULL,
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    ReadAt DATETIME NULL,
    
    FOREIGN KEY (ReceiverId) REFERENCES Users(Id),
    FOREIGN KEY (RelatedOrderId) REFERENCES Orders(Id) ON DELETE SET NULL
);

-- ========== ORDER HISTORY TABLE ==========
CREATE TABLE OrderHistory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrderId INT NOT NULL,
    ActionType NVARCHAR(100), -- 'Created', 'Approved', 'Rejected', 'Uploaded', 'Sent', 'Received', 'PaymentConfirmed'
    ChangedBy INT NOT NULL,
    OldStatus NVARCHAR(50),
    NewStatus NVARCHAR(50),
    Description NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (ChangedBy) REFERENCES Users(Id)
);

-- ========== REPORTS TABLE ==========
CREATE TABLE Reports (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ReportCode NVARCHAR(50) UNIQUE NOT NULL,
    ReportType NVARCHAR(100), -- 'DailyOrders', 'WeeklyOrders', 'MonthlyOrders', 'FinancialReport'
    Title NVARCHAR(255) NOT NULL,
    GeneratedBy INT NOT NULL,
    GeneratedAt DATETIME DEFAULT GETDATE(),
    ReportData NVARCHAR(MAX), -- JSON format
    FilePath NVARCHAR(MAX),
    Status NVARCHAR(50) DEFAULT 'Generated',
    
    FOREIGN KEY (GeneratedBy) REFERENCES Users(Id)
);

-- ========== DOWNLOAD LOGS TABLE ==========
CREATE TABLE DownloadLogs (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ReportId INT NOT NULL,
    DownloadedBy INT NOT NULL,
    DownloadedAt DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (ReportId) REFERENCES Reports(Id),
    FOREIGN KEY (DownloadedBy) REFERENCES Users(Id)
);

-- ========== CREATE INDEXES ==========
CREATE INDEX idx_Orders_CoordinatorId ON Orders(CoordinatorId);
CREATE INDEX idx_Orders_OrderStatus ON Orders(OrderStatus);
CREATE INDEX idx_Orders_ApprovedAt ON Orders(ApprovedAt);
CREATE INDEX idx_Orders_CreatedAt ON Orders(CreatedAt DESC);
CREATE INDEX idx_OrderItems_OrderId ON OrderItems(OrderId);
CREATE INDEX idx_OrderItems_ProductId ON OrderItems(ProductId);
CREATE INDEX idx_Notifications_ReceiverId ON Notifications(ReceiverId);
CREATE INDEX idx_Notifications_IsRead ON Notifications(IsRead);
CREATE INDEX idx_Notifications_CreatedAt ON Notifications(CreatedAt DESC);
CREATE INDEX idx_OrderHistory_OrderId ON OrderHistory(OrderId);
CREATE INDEX idx_OrderHistory_ChangedBy ON OrderHistory(ChangedBy);
CREATE INDEX idx_Reports_GeneratedBy ON Reports(GeneratedBy);
CREATE INDEX idx_Reports_GeneratedAt ON Reports(GeneratedAt DESC);

-- ========== INSERT DEFAULT DATA ==========

-- Default Products
INSERT INTO Products (ProductCode, ProductName, Description, Category, UnitOfMeasure, UnitPrice)
VALUES 
    ('CEMENT-001', 'Cement Bag 50kg', 'Portland Cement 50kg bag', 'Cement', 'Bag', 150000),
    ('CEMENT-002', 'Cement Bag 40kg', 'Portland Cement 40kg bag', 'Cement', 'Bag', 120000),
    ('SAND-001', 'River Sand', 'Quality river sand for construction', 'Sand', 'Ton', 500000),
    ('GRAVEL-001', 'Gravel Mix', 'Mixed size gravel', 'Gravel', 'Ton', 450000),
    ('BRICK-001', 'Clay Brick', 'Standard clay bricks', 'Brick', 'Pallet', 800000);

-- Default Stations
INSERT INTO Stations (StationCode, StationName, Address, Phone, Manager, Status)
VALUES 
    ('STN-001', 'Main Station', 'Hanoi', '0243-123-4567', 'Mr. Tuan', 'Active'),
    ('STN-002', 'North Station', 'Bac Ninh', '0240-456-7890', 'Ms. Linh', 'Active'),
    ('STN-003', 'South Station', 'Ho Chi Minh', '0283-789-0123', 'Mr. Duc', 'Active'),
    ('STN-004', 'East Station', 'Hai Phong', '0225-012-3456', 'Ms. Hoa', 'Active');

-- Insert Role Permissions
INSERT INTO RolePermissions (Role, Permission)
VALUES
    -- Admin permissions
    ('Admin', 'manage_users'),
    ('Admin', 'view_all_orders'),
    ('Admin', 'approve_orders'),
    ('Admin', 'manage_system'),
    ('Admin', 'generate_all_reports'),
    -- Accounting permissions
    ('Accounting', 'approve_orders'),
    ('Accounting', 'confirm_payment'),
    ('Accounting', 'view_assigned_orders'),
    ('Accounting', 'download_reports'),
    ('Accounting', 'receive_notifications'),
    -- Coordinator permissions
    ('Coordinator', 'create_orders'),
    ('Coordinator', 'view_own_orders'),
    ('Coordinator', 'upload_orders'),
    ('Coordinator', 'send_to_station'),
    ('Coordinator', 'download_reports'),
    ('Coordinator', 'receive_notifications'),
    -- Station permissions
    ('Station', 'confirm_receipt'),
    ('Station', 'update_delivery_status'),
    ('Station', 'view_assigned_orders'),
    -- Leader permissions
    ('Leader', 'view_dashboard'),
    ('Leader', 'view_all_orders'),
    ('Leader', 'generate_reports'),
    ('Leader', 'export_data');

PRINT 'Database schema created successfully!';
