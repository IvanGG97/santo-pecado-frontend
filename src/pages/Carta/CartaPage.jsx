import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/api';
import styles from './CartaPage.module.css';
import { Loader2, Tag } from 'lucide-react';
import Swal from 'sweetalert2';

// --- Componente de la Tarjeta de Producto ---
const ProductoCard = ({ item }) => (
    <div className={styles.productCard}>
        <img 
            src={item.producto_imagen || item.producto_imagen_url || 'https://placehold.co/300x200/e1e1e1/777?text=N/A'} 
            alt={item.producto_nombre}
            className={styles.productImage}
            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/300x200/e1e1e1/777?text=Error'; }}
        />
        <div className={styles.productInfo}>
            <h3 className={styles.productName}>{item.producto_nombre}</h3>
            <p className={styles.productDesc}>{item.producto_descripcion}</p>
            <span className={styles.productPrice}>
                ${new Intl.NumberFormat('es-AR').format(item.producto_precio)}
            </span>
        </div>
    </div>
);

// --- Componente de la Tarjeta de Promoción ---
const PromoCard = ({ promo }) => (
    <div className={`${styles.productCard} ${styles.promoCard}`}>
        <div className={styles.promoTag}>
            <Tag size={16} />
            <span>Promoción</span>
        </div>
        <img 
            src={promo.promocion_imagen || promo.promocion_imagen_url || 'https://placehold.co/300x200/a50000/ffffff?text=PROMO'} 
            alt={promo.promocion_nombre}
            className={styles.productImage}
            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/300x200/e1e1e1/777?text=Error'; }}
        />
        <div className={styles.productInfo}>
            <h3 className={styles.productName}>{promo.promocion_nombre}</h3>
            <p className={styles.productDesc}>{promo.promocion_descripcion}</p>
            <span className={styles.productPrice}>
                ${new Intl.NumberFormat('es-AR').format(promo.promocion_precio)}
            </span>
        </div>
    </div>
);


// --- Componente Principal de la Página ---
const CartaPage = () => {
    const [productos, setProductos] = useState([]);
    const [promociones, setPromociones] = useState([]);
    const [tiposProducto, setTiposProducto] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [resProductos, resPromos, resTipos] = await Promise.all([
                    apiClient.get('/inventario/productos/'),
                    apiClient.get('/promocion/promociones/'),
                    apiClient.get('/inventario/tipos-producto/')
                ]);

                setProductos(resProductos.data.filter(p => p.producto_disponible));
                setPromociones(resPromos.data.filter(p => p.promocion_disponible));
                
                // Filtramos los tipos que SÍ tienen productos
                const tiposUsados = new Set(resProductos.data.map(p => p.tipo_producto_id));
                const tiposFiltrados = resTipos.data.filter(t => 
                    tiposUsados.has(t.id) && t.tipo_producto_nombre.toLowerCase() !== 'agregados'
                );
                
                setTiposProducto(tiposFiltrados);

            } catch (error) {
                Swal.fire('Error', 'No se pudo cargar la carta.', 'error');
                console.error("Error cargando la carta:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Agrupamos los productos por categoría
    const productosAgrupados = useMemo(() => {
        return tiposProducto.map(tipo => ({
            ...tipo,
            productos: productos.filter(p => p.tipo_producto_id === tipo.id)
        }));
    }, [productos, tiposProducto]);

    if (loading) {
        return (
            <div className={styles.cartaContainer} style={{ textAlign: 'center', paddingTop: '5rem' }}>
                <Loader2 size={48} className={styles.spinner} />
                <p>Cargando la carta...</p>
            </div>
        );
    }

    return (
        <div className={styles.cartaContainer}>
            <h1 className={styles.mainTitle}>Nuestra Carta</h1>

            {/* --- Sección de Promociones --- */}
            {promociones.length > 0 && (
                <div className={styles.categorySection}>
                    <h2 className={styles.categoryTitle}>Promociones Especiales</h2>
                    <div className={styles.productGrid}>
                        {promociones.map(promo => (
                            <PromoCard key={`promo-${promo.id}`} promo={promo} />
                        ))}
                    </div>
                </div>
            )}

            {/* --- Secciones de Productos por Categoría --- */}
            {productosAgrupados.map(categoria => (
                <div key={categoria.id} className={styles.categorySection}>
                    <h2 className={styles.categoryTitle}>{categoria.tipo_producto_nombre}</h2>
                    <div className={styles.productGrid}>
                        {categoria.productos.map(producto => (
                            <ProductoCard key={producto.id} item={producto} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CartaPage;