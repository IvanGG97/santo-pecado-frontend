import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import logo from '../../assets/images/letras-santo-pecado.jpg';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';

const Sidebar = () => {
    const { user } = useAuth();
    const userRole = user?.rol;
    const location = useLocation();

    // Estado para la caja
    const [cajaAbierta, setCajaAbierta] = useState(false);
    const [loadingCaja, setLoadingCaja] = useState(true);

    // Efecto para verificar el estado de la caja
    useEffect(() => {
        const checkCajaStatus = async () => {
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
    }, [userRole, location.pathname]);

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <img src={logo} alt="Santo Pecado Logo" className={styles.logo} />

                {/* INDICADOR DE CAJA */}
                {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && !loadingCaja && (
                    <div className={`${styles.cajaStatus} ${cajaAbierta ? styles.cajaOpen : styles.cajaClosed}`}>
                        <span className={styles.statusDot}></span>
                        {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                    </div>
                )}
            </div>

            <nav className={styles.nav}>
                <ul>
                    {/* --- 1. INICIO --- */}
                    {userRole !== 'Cocina' && (
                        <li><NavLink to="/inicio" className={({ isActive }) => isActive ? styles.active : ''}><span>🏠 Inicio</span></NavLink></li>
                    )}

                    {/* --- 2. CAJAS (Se mantiene visible para Admin/Encargado) --- */}
                    {/* Nota: Aunque no lo mencionaste explícitamente en la lista, "Cajas" es fundamental para abrir/cerrar turno. Lo dejo aquí por lógica de negocio, o puedes pedirme quitarlo. */}
                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <li><NavLink to="/cajas" className={({ isActive }) => isActive ? styles.active : ''}><span>💰 Cajas</span></NavLink></li>
                    )}

                    {/* --- 3. STOCK INSUMOS --- */}
                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <li><NavLink to="/stock" className={({ isActive }) => isActive ? styles.active : ''}><span>📦 Stock Insumos</span></NavLink></li>
                    )}

                    {/* --- 4. PRODUCTOS --- */}
                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <li><NavLink to="/productos" className={({ isActive }) => isActive ? styles.active : ''}><span>🍔 Productos</span></NavLink></li>
                    )}

                    {/* --- 5. PEDIDOS --- */}
                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <li><NavLink to="/pedidos" className={({ isActive }) => isActive ? styles.active : ''}><span>📝 Toma de Pedidos</span></NavLink></li>
                    )}

                    {/* --- 6. COCINA --- */}
                    {(userRole === 'Admin' || userRole === 'Cocina' || userRole === 'Encargado/Cajero') && (
                        <li>
                            <NavLink to="/cocina" className={({ isActive }) => isActive ? styles.active : ''}>
                                <span>🍳 Cocina</span>
                            </NavLink>
                        </li>
                    )}

                    {/* --- 7. VENTAS --- */}
                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <li><NavLink to="/ventas" className={({ isActive }) => isActive ? styles.active : ''}><span>🏷️ Ventas</span></NavLink></li>
                    )}

                    {/* --- 8. COMPRAS --- */}
                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <li><NavLink to="/compras" className={({ isActive }) => isActive ? styles.active : ''}><span>🛒 Compras</span></NavLink></li>
                    )}

                    {/* --- 9. EMPLEADOS --- */}
                    {userRole === 'Admin' && (
                        <li>
                            <NavLink to="/empleados" className={({ isActive }) => isActive ? styles.active : ''}>
                                <span>👥 Empleados</span>
                            </NavLink>
                        </li>
                    )}

                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;