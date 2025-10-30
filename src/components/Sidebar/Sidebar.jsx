import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import logo from '../../assets/images/logo.jpg';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const { user } = useAuth();
    const userRole = user?.rol; // Guardamos el rol para facilitar la lectura

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <img src={logo} alt="Santo Pecado Logo" className={styles.logo} />
            </div>
            <nav className={styles.nav}>
                <ul>
                    {/* --- ENLACES CONDICIONALES BASADOS EN EL ROL --- */}

                    {/* ENLACE DE INICIO: Visible para Admin y Encargado/Cajero, pero no para Cocina */}
                    {userRole !== 'Cocina' && (
                        <li><NavLink to="/inicio" className={({ isActive }) => isActive ? styles.active : ''}><span>🏠 Inicio</span></NavLink></li>
                    )}

                    {/* ENLACES DE GESTIÓN: Para Admin y Encargado/Cajero */}
                    {(userRole === 'Admin' || userRole === 'Encargado/Cajero') && (
                        <>
                            <li><NavLink to="/cajas" className={({ isActive }) => isActive ? styles.active : ''}><span>💰 Cajas</span></NavLink></li>
                            <li><NavLink to="/stock" className={({ isActive }) => isActive ? styles.active : ''}><span>📦 Stock</span></NavLink></li>
                            <li><NavLink to="/compras" className={({ isActive }) => isActive ? styles.active : ''}><span>🛒 Compras</span></NavLink></li>
                            <li><NavLink to="/ventas" className={({ isActive }) => isActive ? styles.active : ''}><span>🏷️ Venta</span></NavLink></li>
                            <li><NavLink to="/productos" className={({ isActive }) => isActive ? styles.active : ''}><span>🍔 Productos</span></NavLink></li>
                        </>
                    )}

                    {/* ENLACE DE EMPLEADOS: Solo para Admin */}
                    {userRole === 'Admin' && (
                        <li>
                            <NavLink to="/empleados" className={({ isActive }) => isActive ? styles.active : ''}>
                                <span>👥 Empleados/Usuarios</span>
                            </NavLink>
                        </li>
                    )}

                    {/* ENLACE DE PEDIDOS: Visible para todos los roles, incluido Cocina */}
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

