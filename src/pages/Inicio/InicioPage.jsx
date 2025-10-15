import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './InicioPage.module.css'; // Importamos los nuevos estilos

const InicioPage = () => {
    // 1. Obtenemos 'user' para el saludo y 'logoutUser' para la acción de salir.
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();

    // 2. Creamos una función para manejar el logout.
    const handleLogout = () => {
        logoutUser();      // Llama a la función del AuthContext para limpiar el token.
        navigate('/login'); // Redirige al usuario a la página de login.
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Página de Inicio</h1>
                {/* 3. Añadimos el botón y le asignamos la función handleLogout */}
                <button onClick={handleLogout} className={styles.logoutButton}>
                    Cerrar Sesión
                </button>
            </header>
            
            <div className={styles.content}>
                <p className={styles.welcomeText}>
                    ¡Bienvenido de nuevo, {user?.first_name || user?.username}!
                </p>
                <p>
                    Este será el tablero principal con la información más relevante.
                </p>
            </div>
        </div>
    );
};

export default InicioPage;

