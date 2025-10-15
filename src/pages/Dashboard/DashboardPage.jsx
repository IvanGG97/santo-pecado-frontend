import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import styles from './DashboardPage.module.css';

const Dashboard = () => {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    
    // SOLUCIÓN PARTE 1: Inicializar el estado como un array vacío [].
    const [empleados, setEmpleados] = useState([]); 
    
    // SOLUCIÓN PARTE 2: Añadir un estado de carga.
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEmpleados = async () => {
            try {
                // Asumo que tienes un endpoint en Django para listar empleados.
                // Si no lo tienes, esta llamada fallará. ¡Adapta la URL!
                const response = await apiClient.get('/empleado/list/'); // <-- ¡IMPORTANTE! Asegúrate que este endpoint exista.
                setEmpleados(response.data);
                setError('');
            } catch (err) {
                console.error("Error fetching empleados:", err);
                setError('No se pudo cargar la lista de empleados. Es posible que no tengas permisos.');
            } finally {
                setLoading(false); // La carga termina, con o sin error.
            }
        };

        fetchEmpleados();
    }, []); // El array vacío [] significa que este efecto se ejecuta solo una vez.

    const handleLogout = () => {
        logoutUser();
        navigate('/login');
    };

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                {/* El `user.username` viene del token decodificado en AuthContext */}
                <h1 className={styles.welcomeMessage}>
                    Bienvenido, {user?.username || 'Usuario'}!
                </h1>
                <button onClick={handleLogout} className={styles.logoutButton}>
                    Cerrar Sesión
                </button>
            </header>

            <main className={styles.mainContent}>
                <h2>Gestión de Empleados</h2>
                
                {/* SOLUCIÓN PARTE 3: Mostrar un mensaje mientras se carga. */}
                {loading && <p>Cargando empleados...</p>}
                
                {error && <p className={styles.error}>{error}</p>}

                {/* Este .map() ahora es seguro. Si 'empleados' está vacío, no renderiza nada. */}
                {!loading && !error && (
                    <ul className={styles.employeeList}>
                        {empleados.map(empleado => (
                            <li key={empleado.id} className={styles.employeeItem}>
                                <span>{empleado.first_name} {empleado.last_name} ({empleado.username})</span>
                                <span className={styles.role}>{empleado.rol || 'Sin rol asignado'}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default Dashboard;