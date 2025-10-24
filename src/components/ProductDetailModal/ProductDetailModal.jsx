import React from 'react';
import styles from './ProductDetailModal.module.css';

const ProductDetailModal = ({ product, onClose }) => {
    
    // Formatear la fecha para que sea legible
    const formatDate = (dateString) => {
        if (!dateString) return 'No disponible';
        const date = new Date(dateString);
        return date.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                
                <div className={styles.contentGrid}>
                    {/* --- COLUMNA IZQUIERDA: INFORMACIÓN DEL PRODUCTO --- */}
                    <div className={styles.leftColumn}>
                        <h2 className={styles.productName}>{product.producto_nombre}</h2>
                        
                        <img 
                            src={product.producto_imagen || product.producto_imagen_url || 'https://placehold.co/300x300/e1e1e1/777?text=Sin+Imagen'}
                            alt={product.producto_nombre}
                            className={styles.productImage}
                        />
                        
                        <p className={styles.productDescription}>{product.producto_descripcion || "Sin descripción."}</p>
                        
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Precio</span>
                            <span className={styles.infoValue}>
                                ${new Intl.NumberFormat('es-AR').format(product.producto_precio)}
                            </span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Estado</span>
                            <span className={`${styles.statusBadge} ${product.producto_disponible ? styles.statusAvailable : styles.statusUnavailable}`}>
                                {product.producto_disponible ? 'Disponible' : 'No Disponible'}
                            </span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Tipo</span>
                            <span className={styles.infoValue}>{product.tipo_producto}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Fecha de Creación</span>
                            <span className={styles.infoValue}>{formatDate(product.producto_fecha_hora_creacion)}</span>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA: RECETA (INSUMOS) --- */}
                    <div className={styles.rightColumn}>
                        <h3 className={styles.sectionTitle}>Receta de Insumos</h3>
                        <div className={styles.recetaContainer}>
                            {product.receta && product.receta.length > 0 ? (
                                <div className={styles.recetaCardGrid}>
                                    {product.receta.map(item => (
                                        <div key={item.insumo.id} className={styles.recetaCard}>
                                            <img
                                                src={item.insumo.insumo_imagen || item.insumo.insumo_imagen_url || 'https://placehold.co/60x60/e1e1e1/777?text=N/A'}
                                                alt={item.insumo.insumo_nombre}
                                                className={styles.recetaCardImage}
                                            />
                                            <span className={styles.recetaCardName}>{item.insumo.insumo_nombre}</span>
                                            <span className={styles.recetaCardQuantity}>
                                                {/* Convertimos a número para asegurar formato */}
                                                {Number(item.producto_insumo_cantidad)} ({item.insumo.insumo_unidad})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.noReceta}>Este producto no tiene una receta de insumos definida.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.buttons}>
                    <button onClick={onClose} className={styles.cancelButton}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;

