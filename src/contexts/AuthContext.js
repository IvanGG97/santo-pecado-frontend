import React, { createContext, useState, useContext } from 'react';
import apiClient from '../services/api'; 
import { jwtDecode } from 'jwt-decode';

// Función auxiliar para obtener el usuario inicial de forma segura
const getInitialUser = () => {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return null;
        return jwtDecode(JSON.parse(authToken).access);
    } catch (error) {
        console.error("No se pudo decodificar el token del localStorage.", error);
        localStorage.removeItem('authToken');
        return null;
    }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') ? JSON.parse(localStorage.getItem('authToken')) : null);
    const [user, setUser] = useState(getInitialUser);
    const [loading, setLoading] = useState(false);

    const loginUser = async (username, password) => {
        setLoading(true);
        try {
            const response = await apiClient.post('/token/', { username, password });
            if (response.status === 200) {
                const data = response.data;
                setAuthToken(data);
                setUser(jwtDecode(data.access));
                localStorage.setItem('authToken', JSON.stringify(data));
                console.log("AuthContext: Token guardado exitosamente en localStorage.");
                return { success: true };
            }
        } catch (error) {
            console.error("Error en el login:", error);
            const errorMessage = error.response?.data?.detail || "Credenciales inválidas.";
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const logoutUser = () => {
        setAuthToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        console.log("AuthContext: Token eliminado de localStorage.");
    };

    // --- FUNCIÓN DE REGISTRO AÑADIDA ---
    const registerUser = async (userData) => {
        setLoading(true);
        try {
            // Llama al endpoint de registro que creamos en el backend
            const response = await apiClient.post('/empleado/register/', userData);
            // El status 201 'Created' es el éxito estándar para un POST que crea algo nuevo
            if (response.status === 201) {
                 return { success: true };
            }
        } catch (error) {
             console.error("Error en el registro:", error);
             const errorData = error.response?.data;
             let errorMessage = "Ocurrió un error en el registro.";
             if (errorData && typeof errorData === 'object') {
                // Formatea los errores de validación de Django REST Framework
                errorMessage = Object.keys(errorData).map(key => `${key}: ${errorData[key].join(', ')}`).join(' | ');
             } else if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
             }
             return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Objeto que se comparte a través del contexto
    const contextData = {
        user,
        authToken,
        loading,
        loginUser,
        logoutUser,
        registerUser, // <-- ¡LA AÑADIMOS AQUÍ!
    };
    
    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};




