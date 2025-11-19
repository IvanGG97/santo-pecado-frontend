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

    // --- FUNCIÓN AUXILIAR PARA NORMALIZAR TEXTO ---
    const normalizeString = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const handleAdd = async () => {
        const { value: nombre } = await Swal.fire({
            title: 'Añadir Nuevo Tipo de Producto',
            input: 'text',
            inputLabel: 'Nombre del tipo',
            inputPlaceholder: 'Ej: Bebidas sin alcohol',
            // --- 1. HTML para el contador ---
            html: `
                <div style="text-align: right; font-size: 0.8em; color: #888; margin-top: 5px;">
                    <span id="swal-char-count">0</span> / 100
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            inputAttributes: {
                maxlength: 100 // Límite del navegador
            },
            // --- 2. Lógica para actualizar el contador ---
            didOpen: () => {
                const input = Swal.getInput();
                const counter = Swal.getHtmlContainer().querySelector('#swal-char-count');

                if (input && counter) {
                    input.oninput = () => {
                        counter.textContent = input.value.length;
                    };
                }
            },
            inputValidator: (value) => {
                if (!value) {
                    return '¡Necesitas escribir un nombre!';
                }
                // --- VALIDACIÓN DE DUPLICADOS ---
                const normalizedNewName = normalizeString(value);
                const isDuplicate = tipos.some(t => normalizeString(t.tipo_producto_nombre) === normalizedNewName);

                if (isDuplicate) {
                    return '¡Este tipo de producto ya existe!';
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
            // --- 1. HTML para el contador ---
            html: `
                <div style="text-align: right; font-size: 0.8em; color: #888; margin-top: 5px;">
                    <span id="swal-char-count">0</span> / 100
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            cancelButtonText: 'Cancelar',
            inputAttributes: {
                maxlength: 100
            },
            // --- 2. Lógica para actualizar el contador (con valor inicial) ---
            didOpen: () => {
                const input = Swal.getInput();
                const counter = Swal.getHtmlContainer().querySelector('#swal-char-count');

                if (input && counter) {
                    counter.textContent = input.value.length; // Valor inicial
                    input.oninput = () => {
                        counter.textContent = input.value.length;
                    };
                }
            },
            inputValidator: (value) => {
                if (!value) {
                    return '¡El nombre no puede estar vacío!';
                }
                // --- VALIDACIÓN DE DUPLICADOS (Excluyendo el actual) ---
                const normalizedNewName = normalizeString(value);
                const otherTypes = tipos.filter(t => t.id !== tipo.id);
                const isDuplicate = otherTypes.some(t => normalizeString(t.tipo_producto_nombre) === normalizedNewName);

                if (isDuplicate) {
                    return '¡Ya existe otro tipo de producto con este nombre!';
                }
            }
        });

        if (nombre && nombre !== tipo.tipo_producto_nombre) {
            try {
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