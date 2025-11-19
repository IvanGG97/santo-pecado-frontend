import React, { useState, useEffect } from 'react'; // 1. Importamos useState y useEffect
import { NavLink, useLocation } from 'react-router-dom'; // useLocation para refrescar si cambiamos de ruta
import styles from './Sidebar.module.css';
import logo from '../../assets/images/letras-santo-pecado.jpg';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api'; // 2. Importamos apiClient

const Sidebar = () => {
    const { user } = useAuth();
    const userRole = user?.rol;
    const location = useLocation(); // Hook para detectar cambios de ruta

    // 3. Estado para la caja
    const [cajaAbierta, setCajaAbierta] = useState(false);
    const [loadingCaja, setLoadingCaja] = useState(true);

    // 4. Efecto para verificar el estado de la caja
    // Se ejecuta al montar y cada vez que cambia la ruta (por si abren/cierran caja en otra página)
    useEffect(() => {
        const checkCajaStatus = async () => {
            // Solo verificamos si el usuario tiene permisos para ver cajas
            if (userRole === 'Admin' || userRole === 'Encargado/Cajero') {
                try {
                    const res = await apiClient.get('/caja/estado/');
                    if (res.data) {
                        setCajaAbierta(res.data.caja_estado);
                    }
                } catch (error) {
                    console.error("Error verificando caja en sidebar:", error);
                } finally {
                    setLoadingCaja(false);
                }
            }
        };

        checkCajaStatus();
    }, [userRole, location.pathname]); // Dependencia: userRole y cambio de ruta

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <img src={logo} alt="Santo Pecado Logo" className={styles.logo} />
                
                {/* --- 5. INDICADOR DE CAJA --- */}
                {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && !loadingCaja && (
                    <div className={`${styles.cajaStatus} ${cajaAbierta ? styles.cajaOpen : styles.cajaClosed}`}>
                        <span className={styles.statusDot}></span>
                        {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                    </div>
                )}
            </div>

            <nav className={styles.nav}>
                <ul>
                    {/* --- ENLACES CONDICIONALES BASADOS EN EL ROL --- */}

                    {/* ENLACE DE INICIO */}
                    {userRole !== 'Cocina' && (
                        <li><NavLink to="/inicio" className={({ isActive }) => isActive ? styles.active : ''}><span>🏠 Inicio</span></NavLink></li>
                    )}

                    {/* ENLACES DE GESTIÓN */}
                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <>
                            <li><NavLink to="/cajas" className={({ isActive }) => isActive ? styles.active : ''}><span>💰 Cajas</span></NavLink></li>
                            <li><NavLink to="/stock" className={({ isActive }) => isActive ? styles.active : ''}><span>📦 Stock</span></NavLink></li>
                            <li><NavLink to="/compras" className={({ isActive }) => isActive ? styles.active : ''}><span>🛒 Compras</span></NavLink></li>
                            <li><NavLink to="/ventas" className={({ isActive }) => isActive ? styles.active : ''}><span>🏷️ Venta</span></NavLink></li>
                            <li><NavLink to="/productos" className={({ isActive }) => isActive ? styles.active : ''}><span>🍔 Productos</span></NavLink></li>
                        </>
                    )}

                    {/* ENLACE DE EMPLEADOS */}
                    {userRole === 'Admin' && (
                        <li>
                            <NavLink to="/empleados" className={({ isActive }) => isActive ? styles.active : ''}>
                                <span>👥 Empleados/Usuarios</span>
                            </NavLink>
                        </li>
                    )}

                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <li><NavLink to="/pedidos" className={({ isActive }) => isActive ? styles.active : ''}><span>📝 Pedidos</span></NavLink></li>
                    )}

                    {(userRole === 'Admin' || userRole === 'Cocina' || userRole === 'Encargado/Cajero') && (
                        <li>
                            <NavLink to="/cocina" className={({ isActive }) => isActive ? styles.active : ''}>
                                <span>🍳 Cocina</span>
                            </NavLink>
                        </li>
                    )}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;