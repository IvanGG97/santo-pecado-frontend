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

// Componente interno para el formulario de cliente (Crear/Editar)

const ClienteForm = ({ initialData = {}, onSubmit, onCancel, isLoading, error }) => {
    const [formData, setFormData] = useState({
        cliente_nombre: initialData.cliente_nombre || '',
        cliente_apellido: initialData.cliente_apellido || '',
        cliente_telefono: initialData.cliente_telefono || '',
        cliente_direccion: initialData.cliente_direccion || '',
        cliente_dni: initialData.cliente_dni || '',
        cliente_email: initialData.cliente_email || '',
    });

    // Sincroniza el formulario si initialData cambia (para editar)
    useEffect(() => {
        setFormData({
            cliente_nombre: initialData.cliente_nombre || '',
            cliente_apellido: initialData.cliente_apellido || '',
            cliente_telefono: initialData.cliente_telefono || '',
            cliente_direccion: initialData.cliente_direccion || '',
            cliente_dni: initialData.cliente_dni || '',
            cliente_email: initialData.cliente_email || '',
        });
    }, [initialData]);

    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    
    const handleSubmit = (e) => {
        e.preventDefault();
        // Validación simple
        if (!formData.cliente_nombre || !formData.cliente_telefono) {
            alert('Nombre y Teléfono son obligatorios.'); // Considera un mejor manejo de errores
            return;
        }
        onSubmit(formData);
    };

    return (
        
        <form onSubmit={handleSubmit} className={styles.clientForm}>
             
            <h3>{initialData.id ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</h3>
             
            <div className={styles.formGrid}>
                 
                <input type="text" name="cliente_nombre" placeholder="* Nombre" value={formData.cliente_nombre} onChange={handleInputChange} required className={styles.inputField} />
                 
                <input type="text" name="cliente_apellido" placeholder="Apellido" value={formData.cliente_apellido} onChange={handleInputChange} className={styles.inputField} />
                 
                <input type="text" name="cliente_telefono" placeholder="* Teléfono" value={formData.cliente_telefono} onChange={handleInputChange} required className={styles.inputField} />
                 
                <input type="text" name="cliente_direccion" placeholder="Dirección" value={formData.cliente_direccion} onChange={handleInputChange} className={styles.inputField} />
                 
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



const SelectClienteModal = ({ onClose, onClienteSeleccionado }) => {
    // Estados para las vistas y datos generales
    const [activeView, setActiveView] = useState('search'); // 'search' | 'manage' | 'create' | 'edit'
    const [allClientes, setAllClientes] = useState([]);
    const [loadingAll, setLoadingAll] = useState(false);
    const [errorAll, setErrorAll] = useState('');

    // Estados para la vista 'search' (Sugerencias)
    const [searchTermSuggest, setSearchTermSuggest] = useState('');
    const [sugerencias, setSugerencias] = useState([]);
    const [loadingSugerencias, setLoadingSugerencias] = useState(false);
    const [errorSugerencias, setErrorSugerencias] = useState('');
    const debouncedSearchTermSuggest = useDebounce(searchTermSuggest, 500);

    // Estados para la vista 'manage' (Lista completa y búsqueda)
    const [searchTermManage, setSearchTermManage] = useState('');

    // Estados para las vistas 'create' y 'edit'
    const [clienteToEdit, setClienteToEdit] = useState(null);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorSubmit, setErrorSubmit] = useState('');


    // --- EFECTOS ---

    // Carga inicial/Refresco de todos los clientes (se usa useCallback para estabilidad)
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
    }, []); // Dependencias vacías, solo se crea una vez

    // Ejecuta fetchAllClientes al montar
    useEffect(() => {
        fetchAllClientes();
    }, [fetchAllClientes]); // Ahora depende de la función estable

    // Búsqueda de sugerencias (vista 'search')
    useEffect(() => {
        const buscarSugerencias = async () => {
            // No buscar si el término es muy corto o está vacío
            if (debouncedSearchTermSuggest.trim().length < 2) {
                setSugerencias([]);
                setErrorSugerencias(''); // Limpiar error si no hay búsqueda
                return;
            }
            setLoadingSugerencias(true);
            setErrorSugerencias('');
            try {
                
                const response = await apiClient.get(`/cliente/clientes/?search=${debouncedSearchTermSuggest}`);
                setSugerencias(response.data);
                if (response.data.length === 0) {
                    setErrorSugerencias('No se encontraron clientes que coincidan.'); // Mensaje más específico
                }
            } catch (error) {
                console.error("Error buscando clientes:", error);
                setErrorSugerencias('Error al buscar clientes.');
                setSugerencias([]);
            } finally {
                setLoadingSugerencias(false);
            }
        };
        // Solo ejecuta si la vista activa es 'search'
        if (activeView === 'search') {
            buscarSugerencias();
        } else {
            // Limpia sugerencias y errores si cambiamos de vista
            setSugerencias([]);
            setErrorSugerencias('');
        }
    }, [debouncedSearchTermSuggest, activeView]);


    // --- LÓGICA DE FILTRADO (vista 'manage') ---
    const filteredClientesManage = useMemo(() => {
        const term = searchTermManage.toLowerCase().trim();
        if (!term) return allClientes; // Si no hay término, muestra todos
        
        return allClientes.filter(cliente =>
            
            cliente.cliente_nombre?.toLowerCase().includes(term) ||
            
            cliente.cliente_apellido?.toLowerCase().includes(term) ||
            
            cliente.cliente_telefono?.includes(term) ||
            
            cliente.cliente_direccion?.toLowerCase().includes(term) ||
            
            cliente.cliente_dni?.includes(term)
        );
    }, [allClientes, searchTermManage]);


    // --- MANEJADORES DE EVENTOS ---

    // Selecciona un cliente (desde sugerencia o lista completa) y cierra
    
    const handleSelectCliente = (cliente) => {
        onClienteSeleccionado(cliente);
        // onClose(); // La función onClienteSeleccionado ya cierra el modal en PedidosPage
    };

    // Abre el formulario para editar un cliente desde la vista 'manage'
    
    const handleEditClick = (cliente) => {
        setClienteToEdit(cliente);
        setErrorSubmit(''); // Limpiar errores previos del formulario
        setActiveView('edit');
    };

    // Guarda los cambios (Crear o Editar)
    
    const handleFormSubmit = async (formData) => {
        setLoadingSubmit(true);
        setErrorSubmit('');
        
        const isEditing = activeView === 'edit';
         
        const url = isEditing ? `/cliente/clientes/${clienteToEdit.id}/` : '/cliente/clientes/';
        // Usar PUT para editar (o PATCH si tu backend lo prefiere para actualizaciones parciales)
        const method = isEditing ? 'put' : 'post';

        try {
            
            const response = await apiClient[method](url, formData);
            // Si tiene éxito, actualiza la lista completa localmente
            if (isEditing) {
                
                setAllClientes(prev => prev.map(c => c.id === response.data.id ? response.data : c));
            } else {
                
                setAllClientes(prev => [response.data, ...prev]); // Añade al principio para verlo rápido
            }
            // Selecciona el cliente recién creado/editado
            onClienteSeleccionado(response.data);
            // No es necesario llamar a onClose aquí, onClienteSeleccionado ya lo hace.
            // Opcionalmente, puedes volver a la vista de gestión o búsqueda:
            // setActiveView('manage');

        } catch (error) {
            
            console.error(`Error ${isEditing ? 'editando' : 'creando'} cliente:`, error.response?.data || error);
            // Intenta mostrar el error más específico posible (ej. DNI duplicado)
            
            const specificError = error.response?.data?.cliente_dni?.[0]
                               
                               || error.response?.data?.cliente_email?.[0]
                               
                               || error.response?.data?.detail // Mensaje genérico de DRF
                               || `Error al ${isEditing ? 'actualizar' : 'crear'} el cliente.`;
            setErrorSubmit(specificError);
        } finally {
            setLoadingSubmit(false);
        }
    };

    // Cancela la creación/edición y vuelve a la vista anterior
    const handleCancelForm = () => {
        setErrorSubmit('');
        setClienteToEdit(null); // Limpia el cliente en edición
        // Decide a qué vista volver inteligentemente
        setActiveView(activeView === 'edit' ? 'manage' : 'search'); // Si editabas, vuelve a manage, si creabas, a search
    };


    // --- RENDERIZADO ---

    return (
        
        <div className={styles.modalBackdrop}>
            
            <div className={styles.modalContent}>
                
                <button onClick={onClose} className={styles.closeButton}>&times;</button>

                {/* Título dinámico */}
                <h2>
                    {activeView === 'search' && 'Buscar / Seleccionar Cliente'}
                    {activeView === 'manage' && 'Gestionar Clientes'}
                    {activeView === 'create' && 'Crear Nuevo Cliente'}
                    {activeView === 'edit' && 'Editar Cliente'}
                </h2>

                {/* Contenido basado en la vista activa */}

                {/* Vista: Búsqueda Rápida / Sugerencias */}
                {activeView === 'search' && (
                    
                    <div className={styles.viewContainer}>
                        {/* Botón para ir a Gestionar */}
                        
                        <button onClick={() => setActiveView('manage')} className={styles.switchViewButton}>Ver Todos / Gestionar Clientes</button>

                        
                        <div className={styles.searchSection}>
                            <input
                                type="text"
                                placeholder="Buscar por Nombre, Apellido, DNI, Teléfono o Dirección..."
                                value={searchTermSuggest}
                                onChange={(e) => setSearchTermSuggest(e.target.value)}
                                
                                className={styles.searchInput}
                                autoFocus // Enfocar automáticamente al abrir
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

                         {/* Separador y botón para ir a Crear */}
                         
                         <div className={styles.divider}>O</div>
                         
                         <button onClick={() => { setClienteToEdit(null); setActiveView('create'); setErrorSubmit(''); }} className={styles.createButtonInline}>
                             + Crear Nuevo Cliente
                         </button>
                    </div>
                )}

                {/* Vista: Gestionar Clientes (Lista completa) */}
                {activeView === 'manage' && (
                     
                    <div className={styles.viewContainer}>
                         {/* Botón para volver a Búsqueda Rápida */}
                         
                         <button onClick={() => setActiveView('search')} className={styles.switchViewButton}>Volver a Búsqueda Rápida</button>

                         {/* Toolbar: Buscador y Botón Añadir */}
                          
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

                         {/* Lista/Tabla de Clientes */}
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
                                                  {/* No hay botón borrar */}
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

                {/* Vista: Crear Cliente */}
                {activeView === 'create' && (
                     
                    <ClienteForm
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancelForm}
                        isLoading={loadingSubmit}
                        error={errorSubmit}
                    />
                )}

                {/* Vista: Editar Cliente */}
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

