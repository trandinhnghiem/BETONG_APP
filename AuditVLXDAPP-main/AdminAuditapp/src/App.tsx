import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import "./App.css";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Audits from "./pages/Audits";
import Dashboard from "./pages/Dashboard";
import Distributors from "./pages/Distributors";
import ImportExport from "./pages/ImportExport";
import Login from './pages/Login';
import Orders from "./pages/Orders";
import StoreAdd from "./pages/StoreAdd";
import StoreDetail from "./pages/StoreDetail";
import StoreEdit from "./pages/StoreEdit";
import Stores from "./pages/Stores";
import StoreSurveyDetail from "./pages/StoreSurveyDetail";
import StoreSurveyList from "./pages/StoreSurveyList";
import UserAdd from "./pages/UserAdd";
import UserDetail from "./pages/UserDetail";
import UserEdit from "./pages/UserEdit";
import Users from "./pages/Users";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Only allow admin users
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard/user/:userId" element={<UserDetail />} />
        <Route path="users" element={<Users />} />
        <Route path="users/new" element={<UserAdd />} />
        <Route path="users/:id/edit" element={<UserEdit />} />
        <Route path="stores" element={<Stores />} />
        <Route path="stores/new" element={<StoreAdd />} />
        <Route path="stores/:id/edit" element={<StoreEdit />} />
        <Route path="stores/:storeId/survey" element={<StoreSurveyDetail />} />
        <Route path="stores/:id" element={<StoreDetail />} />
        <Route path="store-surveys" element={<StoreSurveyList />} />
        <Route path="audits" element={<Audits />} />
        <Route path="orders" element={<Orders />} />
        <Route path="distributors" element={<Distributors />} />
        <Route path="import-export" element={<ImportExport />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
