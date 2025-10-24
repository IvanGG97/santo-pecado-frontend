import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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
import StockPage from './pages/Stock/StockPage'; // 1. Importamos la nueva página de Stock

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
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* RUTA PARA TODOS LOS USUARIOS LOGUEADOS */}
            <Route path="/inicio" element={<InicioPage />} />
            
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

            {/* 2. AÑADIMOS LA NUEVA RUTA PARA STOCK */}
            <Route 
              path="/stock"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero']}>
                  <StockPage />
                </ProtectedRoute>
              } 
            />

            {/* Aquí puedes seguir añadiendo tus otras páginas con sus reglas de acceso */}

          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

