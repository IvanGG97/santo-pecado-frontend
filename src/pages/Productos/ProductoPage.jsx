import React, { useState } from 'react';
import styles from './ProductoPage.module.css';
import ProductList from '../../components/ProductList/ProductList';
import TipoProductoList from '../../components/TipoProductoList/TipoProductoList';
import PromocionList from '../../components/PromocionList/PromocionList'; // ¡Importamos el nuevo componente!

const ProductoPage = () => {
    const [activeTab, setActiveTab] = useState('productos');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>PRODUCTOS</h1>
            </header>
            <nav className={styles.navTabs}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'productos' ? styles.active : ''}`}
                    onClick={() => setActiveTab('productos')}
                >
                    Productos
                </button>
                
                {/* --- NUEVA PESTAÑA AÑADIDA --- */}
                <button
                    className={`${styles.tabButton} ${activeTab === 'promociones' ? styles.active : ''}`}
                    onClick={() => setActiveTab('promociones')}
                >
                    Promociones
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'tipos' ? styles.active : ''}`}
                    onClick={() => setActiveTab('tipos')}
                >
                    Tipos de Productos
                </button>
            </nav>
            <main className={styles.content}>
                {/* --- LÓGICA DE RENDERIZADO ACTUALIZADA --- */}
                {activeTab === 'productos' && <ProductList />}
                {activeTab === 'tipos' && <TipoProductoList />}
                {activeTab === 'promociones' && <PromocionList />}
            </main>
        </div>
    );
};

export default ProductoPage;

