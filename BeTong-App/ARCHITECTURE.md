# Audit App - Project Rewrite Guide

## 📋 Project Overview

This is a complete rewrite of the Audit App project with the following structure:

- **Web A (Leader Dashboard)**: Executive dashboard for viewing analytics and reports
- **Web B (Operations Portal)**: Management system with 3 roles (Admin, Accounting, Coordinator)
- **Shared Backend API**: Node.js + Express + MSSQL
- **Database**: SQL Server with new schema design

## 🏗️ Project Structure

```
AuditVLXDAPP-main/
├── backend/              # Node.js API Server
│   ├── config/          # Database & Cloudinary config
│   ├── controllers/      # API controllers
│   ├── middlewares/      # Auth middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── database/        # SQL migrations
│   ├── index.js         # Main server file
│   └── package.json
├── apps/
│   ├── web-leader/      # Leader Dashboard (Vite + React)
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── web-operations/  # Operations Portal (Vite + React)
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
└── database/
    ├── schema_design.md  # Database schema documentation
    └── migration_*.sql   # SQL migrations
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
cp .env-example .env
npm install
```

Edit `.env` with your database configuration:
```
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=your_password
DB_NAME=AuditAppDB
JWT_SECRET=your-secret-key-min-32-chars
```

Run database migration:
```bash
# Execute the SQL file in SQL Server Management Studio
# File: database/migration_2026_05_09_create_new_schema.sql
```

Start the backend:
```bash
npm run dev
```

### 2. Web A (Leader Dashboard) Setup

```bash
cd apps/web-leader
cp .env-example .env
npm install
npm run dev
# Runs on http://localhost:3001
```

### 3. Web B (Operations Portal) Setup

```bash
cd apps/web-operations
cp .env-example .env
npm install
npm run dev
# Runs on http://localhost:3002
```

## 📊 Database Schema

The database includes the following main entities:

### Core Tables:
- **Users**: All system users with roles
- **Orders**: Purchase orders workflow
- **OrderItems**: Individual items in orders
- **Products**: Available products
- **Stations**: Pickup/delivery points

### Support Tables:
- **Notifications**: User notifications system
- **OrderHistory**: Audit trail for order changes
- **Reports**: Generated reports
- **RolePermissions**: Role-based access control

### Key Workflows:

#### Order Creation & Approval Flow:
1. Coordinator creates order (Draft)
2. Sends for approval (Pending Approval)
3. Accounting reviews and approves/rejects (Approved/Rejected)
4. If approved → Notification to Coordinator
5. Coordinator uploads to system (Uploading)
6. Coordinator sends to Station (Sent)
7. Station confirms receipt (Delivered)
8. Accounting confirms payment (Completed)

## 🔐 Authentication

- JWT-based authentication
- Roles: Admin, Accounting, Coordinator, Station
- Token expiry: 24 hours
- Endpoints: `/api/auth/login`, `/api/auth/register`

## 🎯 Role-Based Features

### Admin
- Manage all users
- View all orders
- System configuration
- Generate all reports

### Accounting (Kế toán)
- Approve orders
- Confirm payment
- View assigned orders
- Download order reports
- Receive notifications

### Coordinator (Điều phối)
- Create orders
- View own orders
- Upload orders to system
- Send to stations
- Download reports
- Receive notifications

### Station (Trạm)
- Confirm receipt
- Update delivery status
- View assigned orders

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/profile` - Get current user

### Orders
- `POST /api/orders` - Create order (Coordinator)
- `GET /api/orders/my-orders` - Get my orders (Coordinator)
- `GET /api/orders/pending-approval` - Get pending approval (Accounting)
- `POST /api/orders/:id/approve` - Approve order (Accounting)
- `POST /api/orders/:id/reject` - Reject order (Accounting)
- `POST /api/orders/:id/confirm-payment` - Confirm payment (Accounting)
- `GET /api/orders/:id` - Get order details

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread` - Get unread notifications
- `PUT /api/notifications/:id/read` - Mark as read

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user (Admin or self)

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=password
DB_NAME=AuditAppDB
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

## 📝 Development Notes

### Next Steps:
1. ✅ Database schema design
2. ✅ Backend API structure
3. ✅ Frontend project setup
4. ⏳ Frontend UI components for Web A (Leader Dashboard)
5. ⏳ Frontend UI components for Web B (Operations Portal)
6. ⏳ Complete order workflow implementation
7. ⏳ Notification system implementation
8. ⏳ Report generation system
9. ⏳ User management dashboard
10. ⏳ Testing and deployment

### Technologies Used:
- **Backend**: Node.js, Express, MSSQL, JWT, Bcrypt
- **Frontend**: React 19, TypeScript, Vite, React Router, Zustand
- **Database**: SQL Server with JSON storage
- **Authentication**: JWT with role-based access control

## 🚢 Deployment

### Backend Deployment
1. Set production environment variables
2. Build: `npm run build` (if applicable)
3. Start: `npm start`
4. Use a process manager (PM2) for production

### Frontend Deployment
1. Build: `npm run build`
2. Deploy dist folder to static hosting (Vercel, Netlify, AWS S3, etc.)
3. Configure API URL to point to production backend

## 📞 Support

For questions or issues, refer to:
- Database documentation: `database/schema_design.md`
- API routes in `backend/routes/`
- Frontend components in `apps/web-*/src/`

---

**Last Updated**: May 9, 2026
**Version**: 1.0.0
