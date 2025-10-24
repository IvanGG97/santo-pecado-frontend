import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/api';
import styles from './ProductList.module.css';
import Swal from 'sweetalert2';
import AddEditProductModal from '../AddEditProductModal/AddEditProductModal';
import ProductDetailModal from '../ProductDetailModal/ProductDetailModal'; // 1. Importamos el nuevo modal de detalle

const ProductList = () => {
    const [allProductos, setAllProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

    // 2. Nuevos estados para el modal de detalle
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailProduct, setDetailProduct] = useState(null);

    const fetchProductos = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/inventario/productos/');
            setAllProductos(response.data);
        } catch (error) {
            console.error("Error al cargar productos:", error);
            Swal.fire('Error', 'No se pudieron cargar los productos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductos();
    }, []);

    const handleAddClick = () => {
        setSelectedProduct(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    // 3. Nueva función para abrir el modal de detalle
    const handleViewDetailClick = (product) => {
        setDetailProduct(product);
        setIsDetailModalOpen(true);
    };

    const handleDeleteClick = (product) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará el producto "${product.producto_nombre}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/inventario/productos/${product.id}/`);
                    Swal.fire('¡Eliminado!', 'El producto ha sido eliminado.', 'success');
                    fetchProductos();
                } catch (error) {
                    const errorMessage = error.response?.data?.detail || 'No se pudo eliminar el producto.';
                    Swal.fire({
                        icon: 'error',
                        title: 'Acción Bloqueada',
                        text: errorMessage,
                    });
                }
            }
        });
    };

    const filteredProductos = useMemo(() => {
        return allProductos
            .filter(p => {
                if (showOnlyAvailable) {
                    return p.producto_disponible;
                }
                return true;
            })
            .filter(p =>
                p.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [allProductos, searchTerm, showOnlyAvailable]);

    return (
        <div>
            <div className={styles.toolbar}>
                <input
                    type="text"
                    placeholder="Buscar producto..."
                    className={styles.searchInput}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    onClick={() => setShowOnlyAvailable(!showOnlyAvailable)} 
                    className={styles.toggleButton}
                >
                    {showOnlyAvailable ? 'Ver Todos los Productos' : 'Ver Solo Disponibles'}
                </button>
                <button onClick={handleAddClick} className={styles.addButton}>
                    + Añadir Producto
                </button>
            </div>

            {loading ? <p>Cargando productos...</p> : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Imagen</th>
                            <th>Producto</th>
                            <th>Tipo</th>
                            <th>Precio</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProductos.map(product => (
                            <tr key={product.id} className={!product.producto_disponible ? styles.unavailableRow : ''}>
                                <td>
                                    <img 
                                        src={product.producto_imagen || product.producto_imagen_url || 'https://placehold.co/60x60/e1e1e1/777?text=Sin+Imagen'}
                                        alt={product.producto_nombre}
                                        className={styles.productImage}
                                    />
                                </td>
                                <td>{product.producto_nombre}</td>
                                <td>{product.tipo_producto}</td>
                                <td>${new Intl.NumberFormat('es-AR').format(product.producto_precio)}</td>
                                <td className={styles.actions}>
                                    {/* 4. Conectamos el botón a la nueva función */}
                                    <button className={styles.actionButton} onClick={() => handleViewDetailClick(product)}>Ver Detalle</button>
                                    <button className={`${styles.actionButton} ${styles.editButton}`} onClick={() => handleEditClick(product)}>Editar</button>
                                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDeleteClick(product)}>Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Modal para Añadir/Editar */}
            {isModalOpen && (
                <AddEditProductModal
                    product={selectedProduct}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchProductos();
                    }}
                />
            )}

            {/* 5. Renderizamos el nuevo modal de detalle */}
            {isDetailModalOpen && (
                <ProductDetailModal
                    product={detailProduct}
                    onClose={() => setIsDetailModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ProductList;

