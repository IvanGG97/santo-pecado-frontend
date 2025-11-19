import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './CategoriaInsumoList.module.css';
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

    useEffect(() => { fetchCategorias(); }, []);

    // --- FUNCIÓN AUXILIAR PARA NORMALIZAR TEXTO ---
    const normalizeString = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    // Función para AÑADIR una nueva categoría
    const handleAdd = async () => {
        const { value: nombre } = await Swal.fire({
            title: 'Añadir Nueva Categoría de Insumo',
            input: 'text',
            inputLabel: 'Nombre de la categoría',
            inputPlaceholder: 'Ej: Carnes',
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
                const normalizedNewName = normalizeString(value);
                const isDuplicate = categorias.some(cat => normalizeString(cat.categoria_insumo_nombre) === normalizedNewName);

                if (isDuplicate) {
                    return '¡Esta categoría ya existe!';
                }
            }
        });

        if (nombre) {
            try {
                await apiClient.post('/inventario/categorias-insumo/', { categoria_insumo_nombre: nombre });
                Swal.fire('¡Éxito!', `Se añadió "${nombre}" correctamente.`, 'success');
                fetchCategorias();
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
            // --- 2. Lógica para actualizar el contador (Iniciando con el largo actual) ---
            didOpen: () => {
                const input = Swal.getInput();
                const counter = Swal.getHtmlContainer().querySelector('#swal-char-count');

                if (input && counter) {
                    // Inicializar con el largo del nombre actual
                    counter.textContent = input.value.length;

                    input.oninput = () => {
                        counter.textContent = input.value.length;
                    };
                }
            },
            inputValidator: (value) => {
                if (!value) {
                    return '¡El nombre no puede estar vacío!';
                }
                const normalizedNewName = normalizeString(value);
                const otherCategories = categorias.filter(cat => cat.id !== categoria.id);
                const isDuplicate = otherCategories.some(cat => normalizeString(cat.categoria_insumo_nombre) === normalizedNewName);

                if (isDuplicate) {
                    return '¡Ya existe otra categoría con este nombre!';
                }
            }
        });

        if (nombre && nombre !== categoria.categoria_insumo_nombre) {
            try {
                await apiClient.put(`/inventario/categorias-insumo/${categoria.id}/`, { categoria_insumo_nombre: nombre });
                Swal.fire('¡Actualizado!', 'La categoría ha sido actualizada.', 'success');
                fetchCategorias();
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar la categoría.', 'error');
            }
        }
    };

    // --- FUNCIÓN DELETE ---
    const handleDelete = (categoria) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará "${categoria.categoria_insumo_nombre}".`,
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
                    fetchCategorias();
                } catch (error) {
                    if (error.response && error.response.status === 400 && error.response.data.insumos) {
                        const insumosEnUso = error.response.data.insumos.join(', ');
                        const mensaje = `No se puede borrar la categoría porque contiene a estos insumos: ${insumosEnUso}.`;
                        Swal.fire('Acción Bloqueada', mensaje, 'error');
                    } else {
                        console.error("Error al eliminar categoría:", error);
                        const errorMessage = error.response?.data?.detail || 'No se pudo eliminar la categoría.';
                        Swal.fire('Error', errorMessage, 'error');
                    }
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