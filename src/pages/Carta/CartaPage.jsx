import React, { useState, useEffect, useMemo, useRef } from 'react';
import apiClient from '../../services/api';
import styles from './CartaPage.module.css';
import { Loader2, Tag, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import Swal from 'sweetalert2';

// --- Helper para ordenar categorías ---
const CATEGORY_ORDER = ['hamburguesa', 'milanesa', 'lomito', 'bebida'];

const getCategoryPriority = (name) => {
    const lowerName = name.toLowerCase();
    const index = CATEGORY_ORDER.findIndex(keyword => lowerName.includes(keyword));
    return index !== -1 ? index : 999; // Si no está en la lista, va al final
};

// --- Componente Tarjeta de Promoción (CARRUSEL ITEM) ---
const PromoCard = ({ promo }) => (
    <div className={styles.promoCard}>
        <div className={styles.promoTag}>
            <Tag size={14} />
            <span>OFERTA LIMITADA</span>
        </div>
        
        <div className={styles.promoImageContainer}>
            <img 
                src={promo.promocion_imagen || promo.promocion_imagen_url || 'https://placehold.co/400x250/a50000/ffffff?text=PROMO'} 
                alt={promo.promocion_nombre}
                className={styles.promoImage}
                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x250/e1e1e1/777?text=Error'; }}
            />
            <div className={styles.promoOverlay}>
                <span className={styles.promoPrice}>
                    ${new Intl.NumberFormat('es-AR').format(promo.promocion_precio)}
                </span>
            </div>
        </div>

        <div className={styles.promoContent}>
            <h3 className={styles.promoTitle}>{promo.promocion_nombre}</h3>
            <p className={styles.promoDesc}>{promo.promocion_descripcion}</p>
            
            {/* --- LISTA DE PRODUCTOS INCLUIDOS --- */}
            {promo.productos_promocion && promo.productos_promocion.length > 0 && (
                <div className={styles.promoIncludes}>
                    <h4>Incluye:</h4>
                    <ul>
                        {promo.productos_promocion.map((item, idx) => (
                            <li key={idx}>
                                <strong>{item.cantidad}x</strong> {item.producto.producto_nombre}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </div>
);

// --- Componente Tarjeta de Producto Standard ---
const ProductoCard = ({ item }) => (
    <div className={styles.productCard}>
        <div className={styles.productImageWrapper}>
            <img 
                src={item.producto_imagen || item.producto_imagen_url || 'https://placehold.co/300x200/e1e1e1/777?text=N/A'} 
                alt={item.producto_nombre}
                className={styles.productImage}
                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/300x200/e1e1e1/777?text=Error'; }}
            />
        </div>
        <div className={styles.productInfo}>
            <div className={styles.productHeader}>
                <h3 className={styles.productName}>{item.producto_nombre}</h3>
                <span className={styles.productPrice}>
                    ${new Intl.NumberFormat('es-AR').format(item.producto_precio)}
                </span>
            </div>
            <p className={styles.productDesc}>{item.producto_descripcion}</p>
        </div>
    </div>
);


// --- Componente Principal ---
const CartaPage = () => {
    const [productos, setProductos] = useState([]);
    const [promociones, setPromociones] = useState([]);
    const [tiposProducto, setTiposProducto] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null); // Estado para la pestaña activa
    const [loading, setLoading] = useState(true);
    
    const carouselRef = useRef(null);

    // Scroll del carrusel
    const scrollCarousel = (direction) => {
        if (carouselRef.current) {
            const { current } = carouselRef;
            const scrollAmount = 320; // Ancho aproximado de una tarjeta
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

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
                
                // Filtrar tipos que tienen productos y ordenarlos por prioridad
                const tiposUsados = new Set(resProductos.data.map(p => p.tipo_producto_id));
                const tiposFiltrados = resTipos.data
                    .filter(t => tiposUsados.has(t.id) && t.tipo_producto_nombre.toLowerCase() !== 'agregados')
                    .sort((a, b) => getCategoryPriority(a.tipo_producto_nombre) - getCategoryPriority(b.tipo_producto_nombre));
                
                setTiposProducto(tiposFiltrados);
                
                // Seleccionar la primera categoría por defecto
                if (tiposFiltrados.length > 0) {
                    setActiveTabId(tiposFiltrados[0].id);
                }

            } catch (error) {
                Swal.fire('Error', 'No se pudo cargar la carta.', 'error');
                console.error("Error cargando la carta:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filtrar productos según la pestaña activa
    const productosActivos = useMemo(() => {
        if (!activeTabId) return [];
        return productos.filter(p => p.tipo_producto_id === activeTabId);
    }, [productos, activeTabId]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 size={48} className={styles.spinner} />
                <p>Preparando el menú...</p>
            </div>
        );
    }

    return (
        <div className={styles.cartaContainer}>
            <header className={styles.header}>
                <h1 className={styles.mainTitle}>MENÚ SANTO PECADO</h1>
                <p className={styles.subtitle}>Sabor irresistible en cada bocado</p>
            </header>

            {/* --- SECCIÓN CARRUSEL DE PROMOCIONES --- */}
            {promociones.length > 0 && (
                <section className={styles.promoSection}>
                    <h2 className={styles.sectionTitle}>🔥 Promociones Destacadas 🔥</h2>
                    
                    <div className={styles.carouselWrapper}>
                        <button className={`${styles.carouselBtn} ${styles.left}`} onClick={() => scrollCarousel('left')}>
                            <ChevronLeft size={24} />
                        </button>
                        
                        <div className={styles.carouselTrack} ref={carouselRef}>
                            {promociones.map(promo => (
                                <PromoCard key={promo.id} promo={promo} />
                            ))}
                        </div>

                        <button className={`${styles.carouselBtn} ${styles.right}`} onClick={() => scrollCarousel('right')}>
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </section>
            )}

            {/* --- SECCIÓN DE CATEGORÍAS (TABS) --- */}
            <section className={styles.menuSection}>
                {/* Barra de Navegación de Categorías (Sticky) */}
                <div className={styles.tabsContainer}>
                    {tiposProducto.map(tipo => (
                        <button
                            key={tipo.id}
                            className={`${styles.tabButton} ${activeTabId === tipo.id ? styles.activeTab : ''}`}
                            onClick={() => setActiveTabId(tipo.id)}
                        >
                            {tipo.tipo_producto_nombre}
                        </button>
                    ))}
                </div>

                {/* Grid de Productos Activos */}
                <div className={styles.productGrid}>
                    {productosActivos.map(producto => (
                        <ProductoCard key={producto.id} item={producto} />
                    ))}
                </div>
                
                {productosActivos.length === 0 && (
                    <div className={styles.emptyState}>
                        <ShoppingBag size={48} />
                        <p>No hay productos disponibles en esta categoría por el momento.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default CartaPage;