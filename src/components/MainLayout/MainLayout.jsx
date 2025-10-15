import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={styles.content}>
                {/* Outlet renderizará el componente de la ruta hija (Inicio, Empleados, etc.) */}
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
