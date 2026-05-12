import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsersPage from './pages/admin/UsersPage'
import AccountingDashboard from './pages/accounting/Dashboard'
import AccountingOrdersPage from './pages/accounting/OrdersPage'
import AccountingReportsPage from './pages/accounting/ReportsPage'
import CoordinatorDashboard from './pages/coordinator/Dashboard'
import CoordinatorOrdersPage from './pages/coordinator/OrdersPage'
import CoordinatorCreateOrderPage from './pages/coordinator/CreateOrderPage'
import StationDashboard from './pages/station/Dashboard'
import StationOrdersPage from './pages/station/OrdersPage'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="Admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requiredRole="Admin"><AdminUsersPage /></ProtectedRoute>} />
          
          {/* Accounting Routes */}
          <Route path="/accounting" element={<ProtectedRoute requiredRole="Accounting"><AccountingDashboard /></ProtectedRoute>} />
          <Route path="/accounting/orders" element={<ProtectedRoute requiredRole="Accounting"><AccountingOrdersPage /></ProtectedRoute>} />
          <Route path="/accounting/reports" element={<ProtectedRoute requiredRole="Accounting"><AccountingReportsPage /></ProtectedRoute>} />
          
          {/* Coordinator Routes */}
          <Route path="/coordinator" element={<ProtectedRoute requiredRole="Coordinator"><CoordinatorDashboard /></ProtectedRoute>} />
          <Route path="/coordinator/orders" element={<ProtectedRoute requiredRole="Coordinator"><CoordinatorOrdersPage /></ProtectedRoute>} />
          <Route path="/coordinator/create-order" element={<ProtectedRoute requiredRole="Coordinator"><CoordinatorCreateOrderPage /></ProtectedRoute>} />
          <Route path="/coordinator/orders/create" element={<ProtectedRoute requiredRole="Coordinator"><CoordinatorCreateOrderPage /></ProtectedRoute>} />

          {/* Station Routes */}
          <Route path="/station" element={<ProtectedRoute requiredRole="Station"><StationDashboard /></ProtectedRoute>} />
          <Route path="/station/orders" element={<ProtectedRoute requiredRole="Station"><StationOrdersPage /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
