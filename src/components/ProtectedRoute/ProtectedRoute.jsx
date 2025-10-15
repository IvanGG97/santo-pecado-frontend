import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Componente de Ruta Protegida.
 * Verifica la autenticación y, opcionalmente, los roles de usuario antes de renderizar una página.
 * @param {object} props
 * @param {React.ReactNode} props.children - El componente/página a renderizar si el acceso es permitido.
 * @param {string[]} [props.allowedRoles] - Un array de nombres de roles que pueden acceder a la ruta. Si no se provee, solo se verifica la autenticación.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
    // Obtenemos la información del usuario y el token desde nuestro AuthContext.
    const { user, authToken } = useAuth();
    const location = useLocation();

    // 1. Comprobación de Autenticación:
    // Si no hay un token, el usuario no ha iniciado sesión y es redirigido al login.
    if (!authToken) {
        // `state={{ from: location }}` guarda la página que el usuario intentaba visitar.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Comprobación de Permisos por Rol:
    // Esta comprobación solo se ejecuta si la ruta tiene una lista de `allowedRoles`.
    // `user.rol` viene directamente del token JWT que configuramos en el backend.
    if (allowedRoles && !allowedRoles.includes(user?.rol)) {
        // Si el rol del usuario no está en la lista de roles permitidos,
        // lo redirigimos a la página de inicio, ya que no tiene permisos.
        console.warn(`Acceso denegado a la ruta ${location.pathname}. El rol '${user?.rol}' no tiene permiso.`);
        return <Navigate to="/inicio" replace />;
    }

    // 3. Acceso Permitido:
    // Si el usuario está autenticado y (si es necesario) su rol es válido,
    // renderizamos el componente hijo.
    return children;
};

export default ProtectedRoute;
