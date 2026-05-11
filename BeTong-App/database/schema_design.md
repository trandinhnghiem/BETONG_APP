# Database Schema Design - Audit App Rewrite

## Tables Structure

### 1. Users
```sql
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
```

### 2. Roles Permission Mapping
```sql
CREATE TABLE RolePermissions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Role NVARCHAR(50) NOT NULL,
    Permission NVARCHAR(100) NOT NULL,
    UNIQUE(Role, Permission)
);
```

### 3. Products
```sql
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
```

### 4. Stations/Stores (pickup/delivery points)
```sql
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
```

### 5. Orders
```sql
CREATE TABLE Orders (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrderCode NVARCHAR(50) UNIQUE NOT NULL,
    CoordinatorId INT NOT NULL,
    SourceStationId INT NOT NULL,
    DestinationStationId INT NOT NULL,
    OrderDate DATETIME DEFAULT GETDATE(),
    
    -- Status flow: Draft -> Pending Approval -> Approved -> Uploading -> Sent -> Delivered -> Completed/Closed
    OrderStatus NVARCHAR(50) DEFAULT 'Draft',
    
    ApprovedBy INT, -- Accounting user Id
    ApprovedAt DATETIME NULL,
    ApprovalReason NVARCHAR(MAX),
    RejectionReason NVARCHAR(MAX),
    
    -- Uploading to system
    UploadedAt DATETIME NULL,
    SentToStationAt DATETIME NULL,
    StationReceivedAt DATETIME NULL,
    
    -- Payment
    PaymentStatus NVARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Completed'
    PaymentConfirmedBy INT, -- Accounting user Id
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
```

### 6. OrderItems
```sql
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
```

### 7. Notifications
```sql
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
```

### 8. OrderHistory (Audit Trail)
```sql
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
```

### 9. Reports
```sql
CREATE TABLE Reports (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ReportCode NVARCHAR(50) UNIQUE NOT NULL,
    ReportType NVARCHAR(100), -- 'DailyOrders', 'WeeklyOrders', 'MonthlyOrders', 'FinancialReport'
    Title NVARCHAR(255) NOT NULL,
    GeneratedBy INT NOT NULL,
    GeneratedAt DATETIME DEFAULT GETDATE(),
    ReportData NVARCHAR(MAX), -- JSON format
    FilePath NVARCHAR(MAX),
    Status NVARCHAR(50) DEFAULT 'Generated', -- 'Generated', 'Downloaded', 'Archived'
    
    FOREIGN KEY (GeneratedBy) REFERENCES Users(Id)
);
```

### 10. DownloadLogs (Track who downloads reports)
```sql
CREATE TABLE DownloadLogs (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ReportId INT NOT NULL,
    DownloadedBy INT NOT NULL,
    DownloadedAt DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (ReportId) REFERENCES Reports(Id),
    FOREIGN KEY (DownloadedBy) REFERENCES Users(Id)
);
```

## Indexes for Performance
```sql
CREATE INDEX idx_Orders_CoordinatorId ON Orders(CoordinatorId);
CREATE INDEX idx_Orders_OrderStatus ON Orders(OrderStatus);
CREATE INDEX idx_Orders_ApprovedAt ON Orders(ApprovedAt);
CREATE INDEX idx_OrderItems_OrderId ON OrderItems(OrderId);
CREATE INDEX idx_Notifications_ReceiverId ON Notifications(ReceiverId);
CREATE INDEX idx_Notifications_IsRead ON Notifications(IsRead);
CREATE INDEX idx_OrderHistory_OrderId ON OrderHistory(OrderId);
```

## Role Permissions

### Admin
- Manage all users
- View all orders
- System configuration
- Generate all reports

### Accounting (Kế toán)
- View assigned orders
- Approve orders
- Confirm payment
- Download order reports
- View notifications

### Coordinator (Điều phối)
- Create orders
- View own orders
- Upload orders to system
- Send to stations
- Download order reports
- View order status

### Station (Trạm)
- View assigned orders
- Confirm receipt
- Update delivery status

### Leader (Lãnh đạo)
- View all dashboards
- Generate reports
- Export data
- View analytics

## Key Workflows

### Order Creation & Approval Flow
1. Coordinator creates order (Draft)
2. Sends for approval (Pending Approval)
3. Accounting reviews and approves/rejects (Approved/Rejected)
4. If approved → Notification to Coordinator
5. Coordinator uploads to system (Uploading)
6. Coordinator sends to Station (Sent)
7. Station confirms receipt (Delivered)
8. Accounting confirms payment (Completed)

