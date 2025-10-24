import React, { useState } from 'react';
import styles from './StockPage.module.css';
// 1. Importamos los componentes para cada pestaña
import InsumoList from '../../components/InsumoList/InsumoList';
import CategoriaInsumoList from '../../components/CategoriaInsumoList/CategoriaInsumoList';

const StockPage = () => {
    const [activeTab, setActiveTab] = useState('insumos');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>CONTROL DE STOCK</h1>
            </header>
            <nav className={styles.navTabs}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'insumos' ? styles.active : ''}`}
                    onClick={() => setActiveTab('insumos')}
                >
                    Insumos
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'categorias' ? styles.active : ''}`}
                    onClick={() => setActiveTab('categorias')}
                >
                    Categorías de Insumos
                </button>
            </nav>
            <main className={styles.content}>
                {/* 2. Actualizamos la lógica para renderizar el componente correcto */}
                {activeTab === 'insumos' ? <InsumoList /> : <CategoriaInsumoList />}
            </main>
        </div>
    );
};

export default StockPage;