import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ClientLayout from './layouts/ClientLayout';
import CatalogPage from './pages/CatalogPage';
import CarDetailPage from './pages/CarDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ClientLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/autos/:id" element={<CarDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}