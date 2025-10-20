import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './ProductList.module.css';
import Swal from 'sweetalert2';
import AddEditProductModal from '../AddEditProductModal/AddEditProductModal';

const ProductList = () => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const fetchProductos = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/inventario/productos/');
            setProductos(response.data);
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
                    Swal.fire('Error', 'No se pudo eliminar el producto.', 'error');
                }
            }
        });
    };

    const filteredProductos = productos.filter(p =>
        p.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className={styles.toolbar}>
                <input
                    type="text"
                    placeholder="Buscar producto..."
                    className={styles.searchInput}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                            <tr key={product.id}>
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
                                    <button className={styles.actionButton} onClick={() => alert('Detalle de insumos - A implementar')}>Ver Detalle</button>
                                    <button className={`${styles.actionButton} ${styles.editButton}`} onClick={() => handleEditClick(product)}>Editar</button>
                                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDeleteClick(product)}>Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

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
        </div>
    );
};

export default ProductList;
