import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout y Páginas
import MainLayout from './components/MainLayout/MainLayout';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Register/RegisterPage';
import InicioPage from './pages/Inicio/InicioPage';
import EmpleadoPage from './pages/Empleado/EmpleadoPage';

// Utilidades
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* --- RUTAS PÚBLICAS --- */}
          {/* Cualquiera puede acceder a estas rutas, no requieren login */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Redirige la ruta raíz a la página de inicio por defecto */}
          <Route path="/" element={<Navigate to="/inicio" />} />

          {/* --- RUTAS PROTEGIDAS CON LAYOUT --- */}
          {/* Este Route actúa como un contenedor. Primero, verifica si el usuario está logueado. */}
          {/* Si lo está, renderiza el MainLayout (con el Sidebar). */}
          <Route 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Todas las rutas anidadas aquí adentro se renderizarán dentro del MainLayout */}
            
            {/* RUTA PARA TODOS LOS USUARIOS LOGUEADOS */}
            <Route path="/inicio" element={<InicioPage />} />
            
            {/* --- RUTAS CON PERMISOS ESPECÍFICOS --- */}
            
            {/* RUTA SOLO PARA ADMINS */}
            <Route 
              path="/empleados" 
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <EmpleadoPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Aquí puedes seguir añadiendo tus otras páginas con sus reglas de acceso */}
            {/* Ejemplo:
            <Route 
              path="/cajas" 
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero']}>
                  <CajasPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pedidos" 
              element={
                // Esta ruta sería visible para todos los roles
                <ProtectedRoute allowedRoles={['Admin', 'Encargado/Cajero', 'Cocina']}>
                  <PedidosPage />
                </ProtectedRoute>
              } 
            />
            */}
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

