import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header'; // 1. Importamos el nuevo Header
import styles from './MainLayout.module.css';

const MainLayout = () => {
    return (
        <div className={styles.layout}>
            <Sidebar />
            {/* 2. Creamos un contenedor para la parte principal de la página */}
            <div className={styles.mainWrapper}>
                <Header />
                <main className={styles.content}>
                    {/* Outlet renderizará el componente de la ruta hija */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
