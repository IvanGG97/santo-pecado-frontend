import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../../services/api';
// Asumiendo que usa los estilos de SelectClienteModal como dijimos
import styles from './ProveedorManagerModal.module.css';

// Hook de Debounce
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

// --- CORRECCIÓN 1: Mover ProveedorForm AFUERA ---
// Componente de Formulario (adaptado para Proveedor)
// Recibe 'styles' como prop
const ProveedorForm = ({ initialData = {}, onSubmit, onCancel, isLoading, error, styles }) => {
    const [formData, setFormData] = useState({
        proveedor_dni: initialData.proveedor_dni || '',
        proveedor_nombre: initialData.proveedor_nombre || '',
        proveedor_direccion: initialData.proveedor_direccion || '',
        proveedor_telefono: initialData.proveedor_telefono || '',
        proveedor_email: initialData.proveedor_email || '',
    });

    useEffect(() => {
        setFormData({
            proveedor_dni: initialData.proveedor_dni || '',
            proveedor_nombre: initialData.proveedor_nombre || '',
            proveedor_direccion: initialData.proveedor_direccion || '',
            proveedor_telefono: initialData.proveedor_telefono || '',
            proveedor_email: initialData.proveedor_email || '',
        });
    }, [initialData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        console.log(`ProveedorForm Input: ${name} = ${value}`); // DEBUG: Revisa la consola
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Ajusta la validación a los campos requeridos del proveedor
        if (!formData.proveedor_nombre) {
            alert('Nombre es obligatorios.');
            return;
        }
        // if (!formData.proveedor_nombre || !formData.proveedor_telefono || !formData.proveedor_dni) {
        //     alert('Nombre, DNI/CUIT y Teléfono son obligatorios.');
        //     return;
        // }
        onSubmit(formData);
    };

    if (!styles) { // Safeguard
        console.error("Error: 'styles' prop no fue pasada a ProveedorForm");
        return <p>Error al cargar formulario...</p>;
    }

    return (
        <form onSubmit={handleSubmit} className={styles.clientForm}>
            <h3>{initialData.id ? 'Editar Proveedor' : 'Crear Nuevo Proveedor'}</h3>
            <div className={styles.formGrid}>
                {/* Asegúrate que los placeholders coincidan */}
                <input type="text" name="proveedor_nombre" placeholder="* Nombre" value={formData.proveedor_nombre} onChange={handleInputChange} required className={styles.inputField} />
                <input type="text" name="proveedor_dni" placeholder="DNI/CUIT" value={formData.proveedor_dni} onChange={handleInputChange} className={styles.inputField} />
                <input type="text" name="proveedor_telefono" placeholder="Teléfono" value={formData.proveedor_telefono} onChange={handleInputChange} className={styles.inputField} />
                <input type="text" name="proveedor_direccion" placeholder="Dirección" value={formData.proveedor_direccion} onChange={handleInputChange} className={styles.inputField} />
                <input type="email" name="proveedor_email" placeholder="Email" value={formData.proveedor_email} onChange={handleInputChange} className={styles.inputField} />
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
            <div className={styles.formActions}>
                <button type="button" onClick={onCancel} className={styles.cancelButton} disabled={isLoading}>Cancelar</button>
                <button type="submit" disabled={isLoading} className={styles.saveButton}>
                    {isLoading ? 'Guardando...' : (initialData.id ? 'Actualizar' : 'Crear Proveedor')}
                </button>
            </div>
        </form>
    );
};
// --- FIN CORRECCIÓN 1 ---


// Modal Principal de Gestión de Proveedores
const ProveedorManagerModal = ({ onClose, onProveedorSeleccionado }) => {
    // (Estados...)
    const [activeView, setActiveView] = useState('search');
    const [allProveedores, setAllProveedores] = useState([]);
    const [loadingAll, setLoadingAll] = useState(false);
    const [errorAll, setErrorAll] = useState('');
    const [searchTermSuggest, setSearchTermSuggest] = useState('');
    const [sugerencias, setSugerencias] = useState([]);
    const [loadingSugerencias, setLoadingSugerencias] = useState(false);
    const [errorSugerencias, setErrorSugerencias] = useState('');
    const debouncedSearchTermSuggest = useDebounce(searchTermSuggest, 500);
    const [searchTermManage, setSearchTermManage] = useState('');
    const [itemToEdit, setItemToEdit] = useState(null);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorSubmit, setErrorSubmit] = useState('');

    // --- CORRECCIÓN 2: Mover useMemo al nivel superior ---
    const emptyProveedor = useMemo(() => ({
        proveedor_dni: '',
        proveedor_nombre: '',
        proveedor_direccion: '',
        proveedor_telefono: '',
        proveedor_email: '',
    }), []);
    // --- FIN CORRECCIÓN 2 ---

    // (Efectos...)
    const fetchAllProveedores = useCallback(async () => {
        setLoadingAll(true);
        setErrorAll('');
        try {
            const response = await apiClient.get('/compra/proveedores/');
            setAllProveedores(response.data);
        } catch (error) {
            console.error("Error cargando proveedores:", error);
            setErrorAll('No se pudieron cargar los proveedores.');
        } finally {
            setLoadingAll(false);
        }
    }, []);

    useEffect(() => {
        fetchAllProveedores();
    }, [fetchAllProveedores]);

    useEffect(() => {
        const buscarSugerencias = async () => {
            if (debouncedSearchTermSuggest.trim().length < 2) {
                setSugerencias([]);
                setErrorSugerencias('');
                return;
            }
            setLoadingSugerencias(true);
            setErrorSugerencias('');
            try {
                // Filtramos localmente (ya que cargamos todos)
                const term = debouncedSearchTermSuggest.toLowerCase();
                const filtrados = allProveedores.filter(p =>
                    p.proveedor_nombre.toLowerCase().includes(term) ||
                    p.proveedor_dni.includes(term) ||
                    p.proveedor_telefono.includes(term)
                );
                setSugerencias(filtrados);
                if (filtrados.length === 0) {
                    setErrorSugerencias('No se encontraron proveedores.');
                }
            } catch (error) {
                setErrorSugerencias('Error al buscar proveedores.');
            } finally {
                setLoadingSugerencias(false);
            }
        };
        if (activeView === 'search') {
            buscarSugerencias();
        } else {
            setSugerencias([]);
            setErrorSugerencias('');
        }
    }, [debouncedSearchTermSuggest, activeView, allProveedores]);

    // (Filtrado...)
    const filteredProveedoresManage = useMemo(() => {
        const term = searchTermManage.toLowerCase().trim();
        if (!term) return allProveedores;
        return allProveedores.filter(p =>
            p.proveedor_nombre.toLowerCase().includes(term) ||
            p.proveedor_dni.includes(term) ||
            p.proveedor_telefono.includes(term)
        );
    }, [allProveedores, searchTermManage]);

    // (Handlers...)
    const handleSelectProveedor = useCallback((proveedor) => {
        onProveedorSeleccionado(proveedor);
    }, [onProveedorSeleccionado]);

    const handleEditClick = useCallback((proveedor) => {
        setItemToEdit(proveedor);
        setErrorSubmit('');
        setActiveView('edit');
    }, []);

    const handleFormSubmit = useCallback(async (formData) => {
        setLoadingSubmit(true);
        setErrorSubmit('');
        const isEditing = activeView === 'edit';
        const url = isEditing ? `/compra/proveedores/${itemToEdit.id}/` : '/compra/proveedores/';
        const method = isEditing ? 'put' : 'post';

        try {
            const response = await apiClient[method](url, formData);
            await fetchAllProveedores(); // Refresca la lista completa
            onProveedorSeleccionado(response.data); // Selecciona el item
        } catch (error) {
            console.error(`Error ${isEditing ? 'editando' : 'creando'} proveedor:`, error.response?.data || error);
            const specificError = error.response?.data?.proveedor_dni?.[0] || error.response?.data?.detail || 'Error al guardar.';
            setErrorSubmit(specificError);
        } finally {
            setLoadingSubmit(false);
        }
    }, [activeView, itemToEdit, onProveedorSeleccionado, fetchAllProveedores]);

    const handleCancelForm = useCallback(() => {
        setErrorSubmit('');
        setItemToEdit(null);
        setActiveView(activeView === 'edit' ? 'manage' : 'search');
    }, [activeView]);

    if (!styles) return null; // Espera a que los estilos carguen

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>
                    {activeView === 'search' && 'Buscar / Seleccionar Proveedor'}
                    {activeView === 'manage' && 'Gestionar Proveedores'}
                    {activeView === 'create' && 'Crear Nuevo Proveedor'}
                    {activeView === 'edit' && 'Editar Proveedor'}
                </h2>

                {activeView === 'search' && (
                    <div className={styles.viewContainer}>
                        <button onClick={() => setActiveView('manage')} className={styles.switchViewButton}>Ver Todos / Gestionar Proveedores</button>
                        <div className={styles.searchSection}>
                            <input
                                type="text"
                                placeholder="Buscar por Nombre, DNI o Teléfono..."
                                value={searchTermSuggest}
                                onChange={(e) => setSearchTermSuggest(e.target.value)}
                                className={styles.searchInput}
                                autoFocus
                            />
                            {loadingSugerencias && <p className={styles.loadingText}>Buscando...</p>}
                            {errorSugerencias && !loadingSugerencias && sugerencias.length === 0 && <p className={styles.errorText}>{errorSugerencias}</p>}
                            {sugerencias.length > 0 && (
                                <ul className={styles.suggestionsList}>
                                    {sugerencias.map(p => (
                                        <li key={p.id} onClick={() => handleSelectProveedor(p)}>
                                            <strong>{p.proveedor_nombre}</strong>
                                            <small>Tel: {p.proveedor_telefono} | DNI: {p.proveedor_dni}</small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className={styles.divider}>O</div>
                        <button onClick={() => { setItemToEdit(null); setActiveView('create'); setErrorSubmit(''); }} className={styles.createButtonInline}>
                            + Crear Nuevo Proveedor
                        </button>
                    </div>
                )}

                {activeView === 'manage' && (
                    <div className={styles.viewContainer}>
                        <button onClick={() => setActiveView('search')} className={styles.switchViewButton}>Volver a Búsqueda Rápida</button>
                        <div className={styles.manageToolbar}>
                            <input
                                type="text"
                                placeholder="Filtrar lista..."
                                value={searchTermManage}
                                onChange={(e) => setSearchTermManage(e.target.value)}
                                className={styles.searchInput}
                            />
                            <button onClick={() => { setItemToEdit(null); setActiveView('create'); setErrorSubmit(''); }} className={styles.addButton}>
                                + Añadir Proveedor
                            </button>
                        </div>
                        {loadingAll && <p className={styles.loadingText}>Cargando...</p>}
                        {errorAll && <p className={styles.errorText}>{errorAll}</p>}
                        {!loadingAll && !errorAll && (
                            <div className={styles.clientListContainer}>
                                {filteredProveedoresManage.length > 0 ? (
                                    filteredProveedoresManage.map(p => (
                                        <div key={p.id} className={styles.clientListItem}>
                                            <div className={styles.clientInfo} onClick={() => handleSelectProveedor(p)} title="Seleccionar este proveedor">
                                                <strong>{p.proveedor_nombre}</strong>
                                                <small>Tel: {p.proveedor_telefono} {p.proveedor_direccion ? `- ${p.proveedor_direccion}` : ''}</small>
                                            </div>
                                            <div className={styles.clientActions}>
                                                <button onClick={() => handleEditClick(p)} className={styles.editButton}>Editar</button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.noResultsText}>No hay proveedores.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- CORRECCIÓN 3: Pasar 'styles' y 'initialData' estable --- */}
                {activeView === 'create' && (
                    <ProveedorForm
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancelForm}
                        isLoading={loadingSubmit}
                        error={errorSubmit}
                        initialData={emptyProveedor} // Usar el objeto estable
                        styles={styles} // Pasar los estilos
                    />
                )}

                {activeView === 'edit' && itemToEdit && (
                    <ProveedorForm
                        initialData={itemToEdit}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancelForm}
                        isLoading={loadingSubmit}
                        error={errorSubmit}
                        styles={styles} // Pasar los estilos
                    />
                )}
            </div>
        </div>
    );
};

export default ProveedorManagerModal;