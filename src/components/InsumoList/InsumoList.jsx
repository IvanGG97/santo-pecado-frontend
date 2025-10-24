import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/api';
import styles from './InsumoList.module.css';
import Swal from 'sweetalert2';
import AddEditInsumoModal from '../AddEditInsumoModal/AddEditInsumoModal'; // Importamos el nuevo modal

const InsumoList = () => {
    const [allInsumos, setAllInsumos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInsumo, setSelectedInsumo] = useState(null);

    const fetchInsumos = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/inventario/insumos/');
            setAllInsumos(response.data);
        } catch (error) {
            console.error("Error al cargar insumos:", error);
            Swal.fire('Error', 'No se pudieron cargar los insumos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsumos();
    }, []);

    const handleAddClick = () => {
        setSelectedInsumo(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (insumo) => {
        setSelectedInsumo(insumo);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (insumo) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará el insumo "${insumo.insumo_nombre}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/inventario/insumos/${insumo.id}/`);
                    Swal.fire('¡Eliminado!', 'El insumo ha sido eliminado.', 'success');
                    fetchInsumos();
                } catch (error) {
                    // Aquí podríamos verificar si el insumo está en uso en algún Producto_X_Insumo
                    // y mostrar un error específico si el backend lo indica.
                    Swal.fire('Error', 'No se pudo eliminar el insumo.', 'error');
                }
            }
        });
    };

    // Filtramos los insumos por nombre
    const filteredInsumos = useMemo(() => {
        return allInsumos.filter(i =>
            i.insumo_nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allInsumos, searchTerm]);

    return (
        <div>
            <div className={styles.toolbar}>
                <input
                    type="text"
                    placeholder="Buscar insumo..."
                    className={styles.searchInput}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={handleAddClick} className={styles.addButton}>
                    + Añadir Insumo
                </button>
            </div>

            {loading ? <p>Cargando insumos...</p> : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Imagen</th>
                            <th>Insumo</th>
                            <th>Categoría</th>
                            <th>Unidad</th>
                            <th>Stock Actual</th>
                            <th>Stock Mínimo</th>
                            {/* <th>Precio Compra</th> <-- Columna eliminada */}
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInsumos.map(insumo => (
                            <tr key={insumo.id} className={parseFloat(insumo.insumo_stock) <= parseFloat(insumo.insumo_stock_minimo) ? styles.lowStockRow : ''}>
                                <td>
                                    <img 
                                        src={insumo.insumo_imagen || insumo.insumo_imagen_url || 'https://placehold.co/60x60/e1e1e1/777?text=Sin+Imagen'}
                                        alt={insumo.insumo_nombre}
                                        className={styles.insumoImage}
                                    />
                                </td>
                                <td>{insumo.insumo_nombre}</td>
                                <td>{insumo.categoria_insumo}</td>
                                <td>{insumo.insumo_unidad}</td>
                                <td>{insumo.insumo_stock}</td>
                                <td>{insumo.insumo_stock_minimo}</td>
                                {/* <td>${new Intl.NumberFormat('es-AR').format(insumo.insumo_precio_compra)}</td> <-- Celda eliminada */}
                                <td className={styles.actions}>
                                    <button className={`${styles.actionButton} ${styles.editButton}`} onClick={() => handleEditClick(insumo)}>Editar</button>
                                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDeleteClick(insumo)}>Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {isModalOpen && (
                <AddEditInsumoModal
                    insumo={selectedInsumo}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchInsumos();
                    }}
                />
            )}
        </div>
    );
};

export default InsumoList;

