import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout/Layout'

import LoginPage from './pages/auth/LoginPage'

import AdminDashboard from './pages/admin/Dashboard'
import AdminUsersPage from './pages/admin/UsersPage'
import AdminSettingsPage from './pages/admin/SettingsPage'
import Statistics from './pages/admin/Statistics'
import ReportsPage from './pages/admin/ReportsPage'
import AccountingDashboard from './pages/accounting/Dashboard'
import AccountingOrdersPage from './pages/accounting/OrdersPage'
import AccountingReportsPage from './pages/accounting/ReportsPage'
import AccountingStationsPage from './pages/accounting/StationsPage'
import CustomerDebtPage from './pages/accounting/CustomerDebtPage'

import CoordinatorDashboard from './pages/coordinator/Dashboard'
import CoordinatorOrdersPage from './pages/coordinator/OrdersPage'
import CoordinatorCreateOrderPage from './pages/coordinator/CreateOrderPage'
import CoordinatorReportsPage from './pages/coordinator/ReportsPage'
import CoordinatorStationsPage from './pages/coordinator/StationsPage'

import StationDashboard from './pages/station/Dashboard'
import StationOrdersPage from './pages/station/OrdersPage'

import EngineerDashboard from './pages/engineer/Dashboard'

import NotFound from './pages/NotFound'


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* PROTECTED */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >

          {/* ================= ADMIN ================= */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={<ReportsPage />}
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/statistics"
            element={<Statistics />}
          />

          {/* ================= ACCOUNTING ================= */}
          <Route
            path="/accounting"
            element={
              <ProtectedRoute requiredRole="Accounting">
                <AccountingDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accounting/orders"
            element={
              <ProtectedRoute requiredRole="Accounting">
                <AccountingOrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accounting/reports"
            element={
              <ProtectedRoute requiredRole="Accounting">
                <AccountingReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accounting/stations"
            element={
              <ProtectedRoute requiredRole="Accounting">
                <AccountingStationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounting/customer-debts"
            element={<CustomerDebtPage />}
          />

          {/* ================= COORDINATOR ================= */}
          <Route
            path="/coordinator"
            element={
              <ProtectedRoute requiredRole="Coordinator">
                <CoordinatorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coordinator/orders"
            element={
              <ProtectedRoute requiredRole="Coordinator">
                <CoordinatorOrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coordinator/create-order"
            element={
              <ProtectedRoute requiredRole="Coordinator">
                <CoordinatorCreateOrderPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coordinator/orders/create"
            element={
              <ProtectedRoute requiredRole="Coordinator">
                <CoordinatorCreateOrderPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coordinator/reports"
            element={
              <ProtectedRoute requiredRole="Coordinator">
                <CoordinatorReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coordinator/stations"
            element={
              <ProtectedRoute requiredRole="Coordinator">
                <CoordinatorStationsPage />
              </ProtectedRoute>
            }
          />

          {/* ================= STATION ================= */}
          <Route
            path="/station"
            element={
              <ProtectedRoute requiredRole="Station">
                <StationDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/station/orders"
            element={
              <ProtectedRoute requiredRole="Station">
                <StationOrdersPage />
              </ProtectedRoute>
            }
          />

          {/* ================= ENGINEER ================= */}
          <Route
            path="/engineer/"
            element={
              <ProtectedRoute requiredRole="Engineer">
                <EngineerDashboard />
              </ProtectedRoute>
            }
          />


          {/* ================= DEFAULT ================= */}
          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          {/* ================= 404 ================= */}
          <Route
            path="*"
            element={<NotFound />}
          />

        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App