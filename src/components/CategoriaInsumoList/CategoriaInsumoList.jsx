import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './CategoriaInsumoList.module.css'; // Asegúrate de crear este archivo CSS
import Swal from 'sweetalert2';

const CategoriaInsumoList = () => {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);

    // Función para obtener las categorías de la API
    const fetchCategorias = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/inventario/categorias-insumo/');
            setCategorias(res.data);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar las categorías de insumos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Carga las categorías al montar el componente
    useEffect(() => { fetchCategorias(); }, []);

    // Función para AÑADIR una nueva categoría
    const handleAdd = async () => {
        const { value: nombre } = await Swal.fire({
            title: 'Añadir Nueva Categoría de Insumo',
            input: 'text',
            inputLabel: 'Nombre de la categoría',
            inputPlaceholder: 'Ej: Carnes',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) {
                    return '¡Necesitas escribir un nombre!';
                }
            }
        });

        if (nombre) {
            try {
                await apiClient.post('/inventario/categorias-insumo/', { categoria_insumo_nombre: nombre });
                Swal.fire('¡Éxito!', `Se añadió "${nombre}" correctamente.`, 'success');
                fetchCategorias(); // Recarga la lista
            } catch (error) {
                Swal.fire('Error', 'No se pudo añadir la categoría.', 'error');
            }
        }
    };
    
    // Función para EDITAR una categoría existente
    const handleEdit = async (categoria) => {
        const { value: nombre } = await Swal.fire({
            title: 'Editar Categoría de Insumo',
            input: 'text',
            inputLabel: 'Nuevo nombre',
            inputValue: categoria.categoria_insumo_nombre,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) {
                    return '¡El nombre no puede estar vacío!';
                }
            }
        });

        if (nombre && nombre !== categoria.categoria_insumo_nombre) {
            try {
                await apiClient.put(`/inventario/categorias-insumo/${categoria.id}/`, { categoria_insumo_nombre: nombre });
                Swal.fire('¡Actualizado!', 'La categoría ha sido actualizada.', 'success');
                fetchCategorias(); // Recarga la lista
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar la categoría.', 'error');
            }
        }
    };

    // Función para ELIMINAR una categoría
    const handleDelete = (categoria) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará "${categoria.categoria_insumo_nombre}". Asegúrate de que no haya insumos asociados.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/inventario/categorias-insumo/${categoria.id}/`);
                    Swal.fire('¡Eliminada!', 'La categoría ha sido eliminada.', 'success');
                    fetchCategorias(); // Recarga la lista
                } catch (error) {
                    // El backend podría devolver un error 400 si hay insumos asociados
                    const errorMessage = error.response?.data?.detail || 'No se pudo eliminar la categoría.';
                    Swal.fire('Error', errorMessage, 'error');
                }
            }
        });
    };

    return (
        <div>
            <div className={styles.toolbar}>
                <h3>Gestión de Categorías de Insumos</h3>
                <button onClick={handleAdd} className={styles.addButton}>+ Añadir Categoría</button>
            </div>
            {loading ? <p>Cargando categorías...</p> : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre de la Categoría</th>
                            <th className={styles.actionsHeader}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categorias.map(cat => (
                            <tr key={cat.id}>
                                <td>{cat.categoria_insumo_nombre}</td>
                                <td className={styles.actions}>
                                    <button onClick={() => handleEdit(cat)} className={`${styles.actionButton} ${styles.editButton}`}>Editar</button>
                                    <button onClick={() => handleDelete(cat)} className={`${styles.actionButton} ${styles.deleteButton}`}>Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default CategoriaInsumoList;
