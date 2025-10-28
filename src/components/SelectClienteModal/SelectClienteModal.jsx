import React, { useState, useEffect, useMemo, useCallback } from 'react';

import apiClient from '../../services/api'; // Asegúrate que esta ruta sea correcta

import styles from './SelectClienteModal.module.css'; // Asegúrate que esta ruta sea correcta

// Hook simple para debouncing (retraso en la búsqueda)

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

// --- Componente ClienteForm MOVIDO FUERA ---
// Ahora es un componente independiente en el mismo archivo.
// Usa directamente la variable 'styles' importada al principio del archivo.

const ClienteForm = ({ initialData = {}, onSubmit, onCancel, isLoading, error }) => {
    // Estado local del formulario
    const [formData, setFormData] = useState({
        cliente_nombre: '',
        cliente_apellido: '',
        cliente_telefono: '',
        cliente_direccion: '',
        cliente_dni: '',
        cliente_email: '',
    });

    // Sincroniza el formulario con initialData al montar o cuando initialData cambia
    useEffect(() => {
        // console.log("ClienteForm useEffect sync:", initialData); // DEBUG
        setFormData({
            cliente_nombre: initialData.cliente_nombre || '',
            cliente_apellido: initialData.cliente_apellido || '',
            cliente_telefono: initialData.cliente_telefono || '',
            cliente_direccion: initialData.cliente_direccion || '',
            cliente_dni: initialData.cliente_dni || '',
            cliente_email: initialData.cliente_email || '',
        });
    }, [initialData]);

    // Manejador de cambios para TODOS los inputs del formulario

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // console.log(`Input Changed inside ClienteForm: Name=${name}, Value=${value}`); // DEBUG
        // Actualiza el estado formData
        // Esta es la función clave que debe funcionar
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: value
        }));
    };



    const handleSubmit = (e) => {
        e.preventDefault();
        // Validación actualizada
        if (!formData.cliente_nombre || !formData.cliente_telefono || !formData.cliente_direccion) {
            alert('Nombre, Teléfono y Dirección son obligatorios.');
            return;
        }
        onSubmit(formData); // Llama a la función onSubmit pasada como prop
    };

    // Verifica si styles está disponible (viene del scope del archivo)
    if (!styles) {
        console.error("Error crítico: El objeto 'styles' no está disponible en ClienteForm.");
        return <p>Error al cargar estilos del formulario.</p>;
    }

    // console.log("Rendering ClienteForm with formData:", formData); // DEBUG: Ver estado actual


    return (
        // Asegúrate que los className usan el objeto styles importado
        <form onSubmit={handleSubmit} className={styles.clientForm}>
            <h3>{initialData.id ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</h3>
            <div className={styles.formGrid}>
                {/* Inputs con value={formData.nombreDelCampo} y onChange={handleInputChange} */}
                <input type="text" name="cliente_nombre" placeholder="* Nombre" value={formData.cliente_nombre} onChange={handleInputChange} required className={styles.inputField} />
                <input type="text" name="cliente_apellido" placeholder="Apellido" value={formData.cliente_apellido} onChange={handleInputChange} className={styles.inputField} />
                <input type="text" name="cliente_telefono" placeholder="* Teléfono" value={formData.cliente_telefono} onChange={handleInputChange} required className={styles.inputField} />
                <input type="text" name="cliente_direccion" placeholder="* Dirección" value={formData.cliente_direccion} onChange={handleInputChange} required className={styles.inputField} />
                <input type="text" name="cliente_dni" placeholder="DNI" value={formData.cliente_dni} onChange={handleInputChange} className={styles.inputField} />
                <input type="email" name="cliente_email" placeholder="Email" value={formData.cliente_email} onChange={handleInputChange} className={styles.inputField} />
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
            <div className={styles.formActions}>
                <button type="button" onClick={onCancel} className={styles.cancelButton} disabled={isLoading}>Cancelar</button>
                <button type="submit" disabled={isLoading} className={styles.saveButton}>
                    {isLoading ? 'Guardando...' : (initialData.id ? 'Actualizar Cliente' : 'Crear Cliente')}
                </button>
            </div>
        </form>
    );
};
// --- FIN Componente ClienteForm ---


// --- Componente SelectClienteModal ---

const SelectClienteModal = ({ onClose, onClienteSeleccionado }) => {
    // Estados
    const [activeView, setActiveView] = useState('search');
    const [allClientes, setAllClientes] = useState([]);
    const [loadingAll, setLoadingAll] = useState(false);
    const [errorAll, setErrorAll] = useState('');
    const [searchTermSuggest, setSearchTermSuggest] = useState('');
    const [sugerencias, setSugerencias] = useState([]);
    const [loadingSugerencias, setLoadingSugerencias] = useState(false);
    const [errorSugerencias, setErrorSugerencias] = useState('');
    const debouncedSearchTermSuggest = useDebounce(searchTermSuggest, 500);
    const [searchTermManage, setSearchTermManage] = useState('');
    const [clienteToEdit, setClienteToEdit] = useState(null);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorSubmit, setErrorSubmit] = useState('');

    // Objeto estable para initialData del formulario de creación
    const emptyCliente = useMemo(() => ({
        cliente_nombre: '', cliente_apellido: '', cliente_telefono: '',
        cliente_direccion: '', cliente_dni: '', cliente_email: ''
    }), []);


    // --- Efectos ---
    const fetchAllClientes = useCallback(async () => {
        setLoadingAll(true);
        setErrorAll('');
        try {

            const response = await apiClient.get('/cliente/clientes/');
            setAllClientes(response.data);
        } catch (error) {
            console.error("Error cargando todos los clientes:", error);
            setErrorAll('No se pudieron cargar los clientes.');
        } finally {
            setLoadingAll(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchAllClientes();
    }, [fetchAllClientes]);

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

                const response = await apiClient.get(`/cliente/clientes/?search=${debouncedSearchTermSuggest}`);
                setSugerencias(response.data);
                if (response.data.length === 0) {
                    setErrorSugerencias('No se encontraron clientes que coincidan.');
                }
            } catch (error) {
                console.error("Error buscando clientes:", error);
                setErrorSugerencias('Error al buscar clientes.');
                setSugerencias([]);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchTermSuggest, activeView]); // Asumiendo apiClient es estable

    // --- Filtrado ---
    const filteredClientesManage = useMemo(() => {
        const term = searchTermManage.toLowerCase().trim();
        if (!term) return allClientes;

        return allClientes.filter(cliente =>

            cliente.cliente_nombre?.toLowerCase().includes(term) ||

            cliente.cliente_apellido?.toLowerCase().includes(term) ||

            cliente.cliente_telefono?.includes(term) ||

            cliente.cliente_direccion?.toLowerCase().includes(term) ||

            cliente.cliente_dni?.includes(term)
        );
    }, [allClientes, searchTermManage]);

    // --- Handlers ---

    const handleSelectCliente = useCallback((cliente) => {
        onClienteSeleccionado(cliente);
    }, [onClienteSeleccionado]);


    const handleEditClick = useCallback((cliente) => {
        setClienteToEdit(cliente);
        setErrorSubmit('');
        setActiveView('edit');
    }, []);


    const handleFormSubmit = useCallback(async (formData) => {
        setLoadingSubmit(true);
        setErrorSubmit('');

        const isEditing = activeView === 'edit';

        const url = isEditing ? `/cliente/clientes/${clienteToEdit.id}/` : '/cliente/clientes/';
        const method = isEditing ? 'put' : 'post';
        try {

            const response = await apiClient[method](url, formData);
            if (isEditing) {

                setAllClientes(prev => prev.map(c => c.id === response.data.id ? response.data : c));
            } else {

                setAllClientes(prev => [response.data, ...prev]);
            }
            onClienteSeleccionado(response.data);
        } catch (error) {

            console.error(`Error ${isEditing ? 'editando' : 'creando'} cliente:`, error.response?.data || error);

            const specificError = error.response?.data?.cliente_dni?.[0]

                || error.response?.data?.cliente_email?.[0]

                || error.response?.data?.detail
                || `Error al ${isEditing ? 'actualizar' : 'crear'} el cliente.`;
            setErrorSubmit(specificError);
        } finally {
            setLoadingSubmit(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView, clienteToEdit, onClienteSeleccionado]);

    const handleCancelForm = useCallback(() => {
        setErrorSubmit('');
        setClienteToEdit(null);
        setActiveView(activeView === 'edit' ? 'manage' : 'search');
    }, [activeView]);


    // --- RENDERIZADO ---
    if (!styles) {
        console.error("Error: styles no está disponible en SelectClienteModal.");
        return <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ background: 'white', padding: '20px', borderRadius: '5px' }}><p>Error cargando modal...</p></div></div>;
    }

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>
                    {activeView === 'search' && 'Buscar / Seleccionar Cliente'}
                    {activeView === 'manage' && 'Gestionar Clientes'}
                    {activeView === 'create' && 'Crear Nuevo Cliente'}
                    {activeView === 'edit' && 'Editar Cliente'}
                </h2>

                {activeView === 'search' && (
                    <div className={styles.viewContainer}>
                        <button onClick={() => setActiveView('manage')} className={styles.switchViewButton}>Ver Todos / Gestionar Clientes</button>
                        <div className={styles.searchSection}>
                            <input
                                type="text"
                                placeholder="Buscar por Nombre, Apellido, DNI, Teléfono o Dirección..."
                                value={searchTermSuggest}
                                onChange={(e) => setSearchTermSuggest(e.target.value)}
                                className={styles.searchInput}
                                autoFocus
                            />
                            {loadingSugerencias && <p className={styles.loadingText}>Buscando...</p>}
                            {errorSugerencias && !loadingSugerencias && sugerencias.length === 0 && <p className={styles.errorText}>{errorSugerencias}</p>}
                            {sugerencias.length > 0 && (
                                <ul className={styles.suggestionsList}>
                                    {sugerencias.map(cliente => (

                                        <li key={cliente.id} onClick={() => handleSelectCliente(cliente)}>

                                            <strong>{cliente.cliente_nombre} {cliente.cliente_apellido || ''}</strong>
                                            <small>

                                                Tel: {cliente.cliente_telefono}

                                                {cliente.cliente_dni ? ` | DNI: ${cliente.cliente_dni}` : ''}

                                                {cliente.cliente_direccion ? ` | Dir: ${cliente.cliente_direccion}` : ''}
                                            </small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className={styles.divider}>O</div>
                        <button onClick={() => { setClienteToEdit(null); setActiveView('create'); setErrorSubmit(''); }} className={styles.createButtonInline}>
                            + Crear Nuevo Cliente
                        </button>
                    </div>
                )}

                {activeView === 'manage' && (
                    <div className={styles.viewContainer}>
                        <button onClick={() => setActiveView('search')} className={styles.switchViewButton}>Volver a Búsqueda Rápida</button>
                        <div className={styles.manageToolbar}>
                            <input
                                type="text"
                                placeholder="Filtrar lista por Nombre, Apellido, Teléfono, Dirección o DNI..."
                                value={searchTermManage}
                                onChange={(e) => setSearchTermManage(e.target.value)}
                                className={styles.searchInput}
                            />
                            <button onClick={() => { setClienteToEdit(null); setActiveView('create'); setErrorSubmit(''); }} className={styles.addButton}>
                                + Añadir Cliente
                            </button>
                        </div>
                        {loadingAll && <p className={styles.loadingText}>Cargando lista de clientes...</p>}
                        {errorAll && <p className={styles.errorText}>{errorAll}</p>}
                        {!loadingAll && !errorAll && (
                            <div className={styles.clientListContainer}>
                                {filteredClientesManage.length > 0 ? (
                                    filteredClientesManage.map(cliente => (

                                        <div key={cliente.id} className={styles.clientListItem}>

                                            <div className={styles.clientInfo} onClick={() => handleSelectCliente(cliente)} title="Seleccionar este cliente">

                                                <strong>{cliente.cliente_nombre} {cliente.cliente_apellido || ''}</strong>

                                                <small>{cliente.cliente_telefono} {cliente.cliente_direccion ? `- ${cliente.cliente_direccion}` : ''}</small>
                                            </div>

                                            <div className={styles.clientActions}>

                                                <button onClick={() => handleEditClick(cliente)} className={styles.editButton}>Editar</button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.noResultsText}>
                                        {searchTermManage ? 'No hay clientes que coincidan con el filtro.' : 'No hay clientes registrados.'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Renderiza ClienteForm directamente. */}
                {/* ClienteForm está definido FUERA ahora */}
                {activeView === 'create' && (
                    <ClienteForm
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancelForm}
                        isLoading={loadingSubmit}
                        error={errorSubmit}
                        initialData={emptyCliente} // Usa el objeto estable
                    />
                )}

                {activeView === 'edit' && clienteToEdit && (
                    <ClienteForm
                        initialData={clienteToEdit}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancelForm}
                        isLoading={loadingSubmit}
                        error={errorSubmit}
                    />
                )}
            </div>
        </div>
    );
};

export default SelectClienteModal; // Asegúrate que el export sea correcto

