import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ClientLayout from './layouts/ClientLayout';
import BackofficeLayout from './layouts/BackofficeLayout';
import ProtectedRoute from './components/ProtectedRoute';
import CatalogPage from './pages/CatalogPage';
import CarDetailPage from './pages/CarDetailPage';
import MyRentalsPage from './pages/MyRentalsPage';
import LoginPage from './pages/LoginPage';
import FleetPage from './pages/admin/FleetPage';
import UsersPage from './pages/admin/UsersPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import RentalsOpsPage from './pages/admin/RentalsOpsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ClientLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/autos/:id" element={<CarDetailPage />} />
          <Route
            path="/mis-arriendos"
            element={
              <ProtectedRoute allow={['CLIENT', 'ADMIN', 'EMPLOYEE']}>
                <MyRentalsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={['ADMIN', 'EMPLOYEE']}>
              <BackofficeLayout />
            </ProtectedRoute>
          }
        >
          <Route path="arriendos" element={<RentalsOpsPage />} />
          <Route
            path="flota"
            element={
              <ProtectedRoute allow={['ADMIN']} redirectTo="/admin/arriendos">
                <FleetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="usuarios"
            element={
              <ProtectedRoute allow={['ADMIN']} redirectTo="/admin/arriendos">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="usuarios/:id"
            element={
              <ProtectedRoute allow={['ADMIN']} redirectTo="/admin/arriendos">
                <UserDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}