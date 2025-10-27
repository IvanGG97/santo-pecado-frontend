import React, { useState, useEffect, useMemo } from 'react';

import apiClient from '../../services/api'; // Ajusta la ruta si es necesario

import styles from './InsumoList.module.css'; // Ajusta la ruta si es necesario

import Swal from 'sweetalert2';

import AddEditInsumoModal from '../AddEditInsumoModal/AddEditInsumoModal';

const InsumoList = () => {
    // ... (estados y fetchInsumos sin cambios) ...
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


    // --- FUNCIÓN DELETE ACTUALIZADA ---

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
                    fetchInsumos(); // Recarga la lista
                } catch (error) {
                    // --- MANEJO DEL ERROR ESPECÍFICO ---

                    if (error.response && error.response.status === 400 && error.response.data.productos) {
                        // Si es el error 400 y viene la lista de productos
                        const productosEnUso = error.response.data.productos.join(', ');
                        const mensaje = `Este insumo no se puede borrar porque está en estos productos: ${productosEnUso}.`;

                        Swal.fire('Acción Bloqueada', mensaje, 'error');
                    } else {
                        // Si es cualquier otro error
                        console.error("Error al eliminar insumo:", error); // Loguea el error completo para depuración

                        Swal.fire('Error', 'No se pudo eliminar el insumo. Verifique si está en uso.', 'error'); // Mensaje un poco más genérico pero útil
                    }
                    // --- FIN MANEJO DEL ERROR ---
                }
            }
        });
    };
    // --- FIN FUNCIÓN DELETE ---

    // ... (filteredInsumos y JSX sin cambios) ...
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

