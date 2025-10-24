import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './PromocionList.module.css';
import Swal from 'sweetalert2';
import AddEditPromocionModal from '../AddEditPromocionModal/AddEditPromocionModal';

const PromocionList = () => {
    const [promociones, setPromociones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPromocion, setSelectedPromocion] = useState(null);

    const fetchPromociones = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/promocion/promociones/');
            setPromociones(response.data);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar las promociones.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromociones();
    }, []);

    const handleAddClick = () => {
        setSelectedPromocion(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (promocion) => {
        setSelectedPromocion(promocion);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (promocion) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará la promoción "${promocion.promocion_nombre}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/promocion/promociones/${promocion.id}/`);
                    Swal.fire('¡Eliminada!', 'La promoción ha sido eliminada.', 'success');
                    fetchPromociones();
                } catch (error) {
                    Swal.fire('Error', 'No se pudo eliminar la promoción.', 'error');
                }
            }
        });
    };

    return (
        <div>
            <div className={styles.toolbar}>
                <h3>Gestión de Promociones</h3>
                <button onClick={handleAddClick} className={styles.addButton}>+ Añadir Promoción</button>
            </div>
            {loading ? <p>Cargando...</p> : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Precio</th>
                            <th>Productos Incluidos</th>
                            <th>Stock</th>
                            <th>Estado</th> {/* ¡NUEVA COLUMNA! */}
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {promociones.map(promo => (
                            // La fila se atenúa si la promoción no está disponible O si el stock es 0
                            <tr key={promo.id} className={!promo.promocion_disponible || promo.promocion_stock <= 0 ? styles.unavailableRow : ''}>
                                <td>{promo.promocion_nombre}</td>
                                <td>${new Intl.NumberFormat('es-AR').format(promo.promocion_precio)}</td>
                                <td>
                                    <ul className={styles.productList}>
                                        {promo.productos_promocion?.map(item => (
                                            // Se tacha el producto específico si no está disponible
                                            <li key={item.producto.id} className={!item.producto.producto_disponible ? styles.unavailableProduct : ''}>
                                                {item.cantidad}x {item.producto.producto_nombre}
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td>
                                    {promo.promocion_stock > 0 ? (
                                        promo.promocion_stock
                                    ) : (
                                        <span className={styles.outOfStockBadge}>Agotado</span>
                                    )}
                                </td>
                                <td>
                                    {/* --- INDICADOR DE ESTADO --- */}
                                    {promo.promocion_disponible ? (
                                        <span className={`${styles.statusBadge} ${styles.statusAvailable}`}>Disponible</span>
                                    ) : (
                                        <span className={`${styles.statusBadge} ${styles.statusUnavailable}`}>No Disponible</span>
                                    )}
                                </td>
                                <td className={styles.actions}>
                                    <button onClick={() => handleEditClick(promo)} className={styles.editButton}>Editar</button>
                                    <button onClick={() => handleDeleteClick(promo)} className={styles.deleteButton}>Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {isModalOpen && (
                <AddEditPromocionModal
                    promocion={selectedPromocion}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchPromociones();
                    }}
                />
            )}
        </div>
    );
};

export default PromocionList;

