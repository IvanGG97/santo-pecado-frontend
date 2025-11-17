import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/token.css'
// Layout y Páginas
import MainLayout from './components/MainLayout/MainLayout';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Register/RegisterPage';
import InicioPage from './pages/Inicio/InicioPage';
import EmpleadoPage from './pages/Empleado/EmpleadoPage';
import ProductoPage from './pages/Productos/ProductoPage';
import ActivateAccountPage from './pages/ActivateAccount/ActivateAccountPage';
import RequestPasswordResetPage from './pages/RequestPasswordReset/RequestPasswordResetPage';
import ResetPasswordPage from './pages/ResetPassword/ResetPasswordPage';
import StockPage from './pages/Stock/StockPage';
import PedidosPage from './pages/Pedidos/PedidosPage';
import CocinaPage from './pages/Cocina/CocinaPage';
import VentasPage from './pages/Ventas/VentasPage';
import ComprasPage from './pages/Compras/ComprasPage';
import CajasPage from './pages/Caja/CajasPage';
import CartaPage from './pages/Carta/CartaPage';
import BienvenidoPage from './pages/Bienvenido/BienvenidoPage';

// Utilidades
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* --- RUTAS PÚBLICAS --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/recuperar-contrasena" element={<RequestPasswordResetPage />} />
          <Route path="/activar-cuenta/:uidb64/:token" element={<ActivateAccountPage />} />
          <Route path="/restablecer-contrasena/:uidb64/:token" element={<ResetPasswordPage />} />
          <Route path="/" element={<Navigate to="/inicio" />} />

          
          {/* --- RUTAS PROTEGIDAS CON LAYOUT --- */}
          <Route
            element={
              <ProtectedRoute> {/* <-- Esto protege a TODOS los hijos (requiere login) */}
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* --- RUTA /inicio MODIFICADA ---
              Ahora es el "router de roles". Todos los usuarios logueados 
              llegan aquí, e InicioPage decide qué mostrar o a dónde redirigir.
            */}
            <Route path="/inicio" element={<InicioPage />} />

            {/* --- NUEVAS RUTAS PARA CLIENTES --- */}
            <Route
              path="/carta"
              element={
                // Todos los roles pueden ver la carta
                <ProtectedRoute allowedRoles={['Cliente', 'Admin', 'Encargado/Cajero', 'Cocina']}>
                  <CartaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bienvenido"
              element={
                // Solo los clientes ven la bienvenida
                <ProtectedRoute allowedRoles={['Cliente']}>
                  <BienvenidoPage />
                </ProtectedRoute>
              }
            />
            
            {/* --- RUTAS DE STAFF --- */}

            {/* RUTA SOLO PARA ADMINS */}
            <Route
              path="/empleados"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <EmpleadoPage />
                </ProtectedRoute>
              }
            />

            {/* RUTA PARA ADMINS Y ENCARGADOS */}
            <Route
              path="/productos"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero']}>
                  <ProductoPage />
                </ProtectedRoute>
              }
            />

            {/* RUTA PARA ADMINS Y ENCARGADOS */}
            <Route
              path="/stock"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero']}>
                  <StockPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/pedidos"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero']}>
                  <PedidosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cocina"
              element={
                // Corregido: "roles" debe ser "allowedRoles" (asumiendo tu componente)
                <ProtectedRoute allowedRoles={['Cocina', 'Admin', 'Encargado/Cajero']}>
                  <CocinaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ventas"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero']}>
                  <VentasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compras"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero']}>
                  <ComprasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cajas"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero']}>
                  <CajasPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/inicio" />} />

          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;