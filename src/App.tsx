import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ClientLayout from './layouts/ClientLayout';
import BackofficeLayout from './layouts/BackofficeLayout';
import ProtectedRoute from './components/ProtectedRoute';
import CatalogPage from './pages/CatalogPage';
import CarDetailPage from './pages/CarDetailPage';
import MyRentalsPage from './pages/MyRentalsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FleetPage from './pages/admin/FleetPage';
import CarDetailAdminPage from './pages/admin/CarDetailAdminPage';
import UsersPage from './pages/admin/UsersPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import RentalsOpsPage from './pages/admin/RentalsOpsPage';
import RentalDetailPage from './pages/admin/RentalDetailPage';

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
        <Route path="/registro" element={<RegisterPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={['ADMIN', 'EMPLOYEE']}>
              <BackofficeLayout />
            </ProtectedRoute>
          }
        >
          {/* Arriendos: la lista y la ficha las pueden abrir ADMIN y EMPLOYEE */}
          <Route path="arriendos" element={<RentalsOpsPage />} />
          <Route path="arriendos/:id" element={<RentalDetailPage />} />

          <Route
            path="flota"
            element={
              <ProtectedRoute allow={['ADMIN']} redirectTo="/admin/arriendos">
                <FleetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="flota/:id"
            element={
              <ProtectedRoute allow={['ADMIN']} redirectTo="/admin/arriendos">
                <CarDetailAdminPage />
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