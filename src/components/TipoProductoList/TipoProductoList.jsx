import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './TipoProductoList.module.css';
import Swal from 'sweetalert2';

const TipoProductoList = () => {
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTipos = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/inventario/tipos-producto/');
            setTipos(res.data);
        } catch (error) {
            Swal.fire('Error', 'No se pudieron cargar los tipos de producto.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTipos(); }, []);

    const handleAdd = async () => {
        const { value: nombre } = await Swal.fire({
            title: 'Añadir Nuevo Tipo de Producto',
            input: 'text',
            inputLabel: 'Nombre del tipo',
            inputPlaceholder: 'Ej: Bebidas sin alcohol',
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
                await apiClient.post('/inventario/tipos-producto/', { tipo_producto_nombre: nombre });
                Swal.fire('¡Éxito!', `Se añadió "${nombre}" correctamente.`, 'success');
                fetchTipos();
            } catch (error) {
                Swal.fire('Error', 'No se pudo añadir el tipo de producto.', 'error');
            }
        }
    };
    
    const handleEdit = async (tipo) => {
        const { value: nombre } = await Swal.fire({
            title: 'Editar Tipo de Producto',
            input: 'text',
            inputLabel: 'Nuevo nombre',
            inputValue: tipo.tipo_producto_nombre,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) {
                    return '¡El nombre no puede estar vacío!';
                }
            }
        });

        if (nombre && nombre !== tipo.tipo_producto_nombre) {
            try {
                // Llama al endpoint de detalle para actualizar
                await apiClient.put(`/inventario/tipos-producto/${tipo.id}/`, { tipo_producto_nombre: nombre });
                Swal.fire('¡Actualizado!', 'El tipo de producto ha sido actualizado.', 'success');
                fetchTipos();
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar el tipo de producto.', 'error');
            }
        }
    };

    const handleDelete = (tipo) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará "${tipo.tipo_producto_nombre}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Llama al endpoint de detalle para eliminar
                    await apiClient.delete(`/inventario/tipos-producto/${tipo.id}/`);
                    Swal.fire('¡Eliminado!', 'El tipo de producto ha sido eliminado.', 'success');
                    fetchTipos();
                } catch (error) {
                    const errorMessage = error.response?.data?.detail || 'No se pudo eliminar el tipo de producto.';
                    Swal.fire('Acción Bloqueada', errorMessage, 'error');
                }
            }
        });
    };

    return (
        <div>
            <div className={styles.toolbar}>
                <h3>Gestión de Tipos de Producto</h3>
                <button onClick={handleAdd} className={styles.addButton}>+ Añadir Tipo</button>
            </div>
            {loading ? <p>Cargando...</p> : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre del Tipo</th>
                            <th className={styles.actionsHeader}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tipos.map(tipo => (
                            <tr key={tipo.id}>
                                <td>{tipo.tipo_producto_nombre}</td>
                                <td className={styles.actions}>
                                    <button onClick={() => handleEdit(tipo)} className={`${styles.actionButton} ${styles.editButton}`}>Editar</button>
                                    <button onClick={() => handleDelete(tipo)} className={`${styles.actionButton} ${styles.deleteButton}`}>Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default TipoProductoList;

