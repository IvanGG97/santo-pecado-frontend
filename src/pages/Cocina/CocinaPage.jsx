import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Asegúrate que esta ruta a tu archivo api.js sea correcta desde src/pages/Cocina/
import apiClient from '../../services/api';
// Asegúrate que este archivo CSS exista en la misma carpeta (src/pages/Cocina/)
import styles from './CocinaPage.module.css';



const today = new Date().toISOString().split('T')[0];
// --- Componente Simple de Mensajes ---
const MessageBox = ({ message, type, onClose }) => {
    if (!message) return null;
    return (
        <div className={`${styles.messageBox} ${type === 'error' ? styles.error : styles.success}`}>
            <p>{message}</p>
            <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
    );
};

// --- Mapeo de Nombres de Estado a Clases CSS ---
const estadoColorMap = {
    'Recibido En Cocina': 'recibido',
    'En Preparación': 'en-proceso',
    'Completado': 'completado',
    'Cancelado': 'cancelado'
};

// --- NUEVO: Jerarquía de Estados (Workflow) ---
// Define el orden lógico de los estados
const estadoOrden = {
    'Recibido En Cocina': 1,
    'En Preparación': 2,
    'Completado': 3, // Estado final
    'Cancelado': 99, // Estado final (número alto)
    // 'Pendiente' tendría 0, por eso no se muestra
};


// --- Componente ComandaCard (ACTUALIZADO con workflow y teléfono) ---
const ComandaCard = ({ pedido, estadosDisponibles, onUpdateStatus }) => {

    const estadoActual = estadosDisponibles.find(e => e.estado_pedido_nombre === pedido.estado_pedido) || { estado_pedido_nombre: 'Desconocido' };

    const cardBgClass = estadoColorMap[estadoActual.estado_pedido_nombre]
        ? styles[`estado-${estadoColorMap[estadoActual.estado_pedido_nombre]}-bg`]
        : '';

    // --- LÓGICA WORKFLOW: Determinar orden y si es estado final ---
    const ordenActual = estadoOrden[estadoActual.estado_pedido_nombre] || 0;
    // Es estado final si es Completado o Cancelado
    const isFinalState = ordenActual === estadoOrden['Completado'] || ordenActual === estadoOrden['Cancelado'];
    // --- FIN LÓGICA WORKFLOW ---

    return (
        <div className={`${styles.comandaCard} ${cardBgClass}`}>
            <div className={styles.cardHeader}>
                <h3>Pedido #{pedido.id}</h3>
                <span className={styles.estadoActualBadge}>{estadoActual.estado_pedido_nombre}</span>
            </div>

            {/* --- Sección Cliente (Actualizada con Teléfono) --- */}
            {pedido.cliente && (
                <div className={styles.clienteInfoSection}>
                    <span className={styles.clienteNombre}>
                        👤 {pedido.cliente.cliente_nombre} {pedido.cliente.cliente_apellido || ''}
                    </span>
                    {/* NUEVO: Mostrar teléfono si existe */}
                    {pedido.cliente.cliente_telefono && (
                        <span className={styles.clienteTelefono}>
                            📞 {pedido.cliente.cliente_telefono}
                        </span>
                    )}
                    {pedido.cliente.cliente_direccion && (
                        <span className={styles.clienteDireccion}>
                            📍 {pedido.cliente.cliente_direccion}
                        </span>
                    )}
                </div>
            )}
            {/* --- FIN Sección Cliente --- */}

            <div className={styles.cardBody}>
                {pedido.detalles.map((item, index) => (
                    <div key={`${pedido.id}-${index}-${item.producto_nombre || item.notas}`} className={styles.detalleItem}>
                        <span className={styles.cantidad}>{item.cantidad}x</span>
                        <div className={styles.itemInfo}>
                            <span className={styles.nombre}>{item.producto_nombre || item.notas || 'Item'}</span>
                            {item.notas && item.notas !== item.producto_nombre && (
                                <span className={styles.notas}>↳ {item.notas}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.cardFooter}>
                {/* --- LÓGICA WORKFLOW: Mostrar botones solo si no es estado final --- */}
                {!isFinalState ? (
                    <>
                        <span>Cambiar estado a:</span>
                        <div className={styles.botonesEstado}>
                            {estadosDisponibles.map(estado => {
                                const buttonColorClass = estadoColorMap[estado.estado_pedido_nombre]
                                    ? styles[`boton-${estadoColorMap[estado.estado_pedido_nombre]}`]
                                    : '';

                                // --- LÓGICA WORKFLOW: Filtrar botones ---
                                const ordenNuevo = estadoOrden[estado.estado_pedido_nombre] || 0;

                                // 1. No mostrar si es el estado actual
                                if (ordenNuevo === ordenActual) {
                                    return null;
                                }

                                // 2. Definir las excepciones (siempre se puede cancelar)
                                const esCancelado = estado.estado_pedido_nombre === 'Cancelado';

                                // 3. Definir el paso lógico siguiente
                                // (Ej: Si ordenActual=1, esSiguientePaso es true solo si ordenNuevo=2)
                                const esSiguientePaso = ordenNuevo === ordenActual + 1;

                                // 4. Mostrar el botón SOLAMENTE si es "Cancelado" O si es el "Siguiente Paso"
                                if (!esCancelado && !esSiguientePaso) {
                                    return null;
                                }
                                // --- FIN LÓGICA WORKFLOW ---

                                const estadoIdParaUpdate = estado.id;

                                return (
                                    <button
                                        key={estado.id}
                                        onClick={() => onUpdateStatus(pedido.id, estadoIdParaUpdate, estado.estado_pedido_nombre)}
                                        className={`${styles.botonEstado} ${buttonColorClass}`}
                                    >
                                        {estado.estado_pedido_nombre}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    // Si es estado final, solo mostrar el texto
                    <span className={styles.estadoFinalizado}>Pedido {estadoActual.estado_pedido_nombre}</span>
                )}

                <small className={styles.timestamp}>
                    Recibido: {new Date(pedido.pedido_fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
            </div>
        </div>
    );
};


// --- Componente Principal CocinaPage (ACTUALIZADO con Filtros) ---
const CocinaPage = () => {
    const [allPedidos, setAllPedidos] = useState([]); // Guarda TODOS los pedidos
    const [estados, setEstados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [message, setMessage] = useState({ text: null, type: 'info' });

    // --- ESTADOS PARA LOS INPUTS DE FILTRO ---
    const defaultStatus = 'Recibido En Cocina';
    const [inputStatusFilter, setInputStatusFilter] = useState(defaultStatus);
    const [inputDateRange, setInputDateRange] = useState({ desde: '', hasta: '' });
    const [inputPedidoId, setInputPedidoId] = useState(''); // Nuevo estado para input Pedido ID

    // --- ESTADO PARA LOS FILTROS APLICADOS ---
    const [activeFilters, setActiveFilters] = useState({
        status: defaultStatus,
        desde: '',
        hasta: '',
        pedidoId: '' // Nuevo campo de filtro activo
    });

    // Definir filtros de estado disponibles
    const STATUS_FILTERS = useMemo(() => ['Recibido En Cocina', 'En Preparación', 'Completado', 'Cancelado', 'Todos'], []);


    const showMessage = (text, type = 'info', duration = 5000) => {
        setMessage({ text, type });
        if (duration) {
            setTimeout(() => setMessage(prev => prev.text === text ? { text: null, type: 'info' } : prev), duration);
        }
    };

    // Función para buscar datos
    const fetchData = useCallback(async () => {
        let shouldFetch = true;
        setIsFetching(currentFetching => {
            if (currentFetching) shouldFetch = false;
            return true;
        });
        if (!shouldFetch) return;

        try {
            const [resPedidos, resEstados] = await Promise.all([
                apiClient.get('/pedido/pedidos/'),
                apiClient.get('/pedido/estados/')
            ]);

            const estadosData = resEstados.data;
            setEstados(estadosData);

            const todosLosPedidos = resPedidos.data
                .map(p => ({
                    ...p,
                    estado_pedido_id: estadosData.find(e => e.estado_pedido_nombre === p.estado_pedido)?.id || null
                }))
                .sort((a, b) => new Date(a.pedido_fecha_hora) - new Date(b.pedido_fecha_hora));

            setAllPedidos(currentPedidos => {
                const currentSignature = JSON.stringify(currentPedidos.map(p => ({ id: p.id, estado: p.estado_pedido_id, cliente: p.cliente?.id })));
                const newSignature = JSON.stringify(todosLosPedidos.map(p => ({ id: p.id, estado: p.estado_pedido_id, cliente: p.cliente?.id })));
                if (currentSignature !== newSignature) {
                    return todosLosPedidos;
                }
                return currentPedidos;
            });

            setLoading(false);

        } catch (err) {
            console.error("Error fetching data:", err);
            showMessage('Error al cargar los datos.', 'error', null);
            setLoading(false);
        } finally {
            setIsFetching(false);
        }
    }, []);


    // Carga inicial y Refresco periódico
    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000);
        return () => clearInterval(intervalId);
    }, [fetchData]);


    // --- LÓGICA DE FILTRADO COMBINADO ---
    const filteredPedidos = useMemo(() => {
        // Lee desde activeFilters
        const { status, pedidoId, desde, hasta } = activeFilters;

        return allPedidos.filter(pedido => {

            // 1. Filtro por Estado
            if (status !== 'Todos' && pedido.estado_pedido !== status) {
                return false;
            }

            // 2. Filtro por N° de Pedido
            if (pedidoId) {
                if (!pedido.id.toString().includes(pedidoId)) {
                    return false;
                }
            }

            // 3. Filtro por Fecha "Desde"
            if (desde) {
                try {
                    const fechaDesde = new Date(desde);
                    fechaDesde.setHours(0, 0, 0, 0);
                    const fechaPedido = new Date(pedido.pedido_fecha_hora);
                    if (fechaPedido < fechaDesde) {
                        return false;
                    }
                } catch (e) { console.warn("Fecha 'desde' inválida:", desde); }
            }

            // 4. Filtro por Fecha "Hasta"
            if (hasta) {
                try {
                    const fechaHasta = new Date(hasta);
                    fechaHasta.setHours(23, 59, 59, 999);
                    const fechaPedido = new Date(pedido.pedido_fecha_hora);
                    if (fechaPedido > fechaHasta) {
                        return false;
                    }
                } catch (e) { console.warn("Fecha 'hasta' inválida:", hasta); }
            }

            return true;
        });
    }, [allPedidos, activeFilters]); // Depende de allPedidos y activeFilters

    // --- Handlers para inputs de filtros ---
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setInputDateRange(prevRange => ({
            ...prevRange,
            [name]: value
        }));
    };

    const handlePedidoIdChange = (e) => {
        setInputPedidoId(e.target.value);
    };

    const handleStatusFilterChange = (status) => {
        setInputStatusFilter(status);
    };

    // --- Handlers para botones de Aplicar/Limpiar ---
    const handleAplicarFiltros = () => {
        setActiveFilters({
            status: inputStatusFilter,
            desde: inputDateRange.desde,
            hasta: inputDateRange.hasta,
            pedidoId: inputPedidoId.trim()
        });
    };

    const handleLimpiarFiltros = () => {
        // Resetear inputs
        setInputStatusFilter(defaultStatus);
        setInputDateRange({ desde: '', hasta: '' });
        setInputPedidoId('');
        // Resetear filtros activos
        setActiveFilters({
            status: defaultStatus,
            desde: '',
            hasta: '',
            pedidoId: ''
        });
    };
    // --- FIN Handlers Filtros ---


    // Manejador para actualizar el estado
    const handleUpdateStatus = async (pedidoId, nuevoEstadoId, nuevoEstadoNombre) => {
        let shouldUpdate = true;
        setIsFetching(currentFetching => {
            if (currentFetching) shouldUpdate = false;
            return true;
        });
        if (!shouldUpdate) return;

        const pedidoOriginal = allPedidos.find(p => p.id === pedidoId);

        try {
            // Actualización optimista
            setAllPedidos(prevPedidos => prevPedidos.map(p =>
                p.id === pedidoId
                    ? { ...p, estado_pedido_id: nuevoEstadoId, estado_pedido: nuevoEstadoNombre }
                    : p
            ));

            await apiClient.patch(`/pedido/pedidos/${pedidoId}/`, {
                estado_pedido: nuevoEstadoId
            });
            showMessage(`Pedido #${pedidoId} actualizado a ${nuevoEstadoNombre}.`, 'success', 3000);

        } catch (err) {
            // --- NUEVO: Manejo de error de stock desde el backend ---
            // @ts-ignore
            const errorMessage = err.response?.data?.detail || `Error al actualizar estado del Pedido #${pedidoId}.`;
            showMessage(errorMessage, 'error', 6000); // Mostrar error de backend (ej. "Stock insuficiente...")

            // Revertir cambio optimista en caso de error
            if (pedidoOriginal) {
                setAllPedidos(prevPedidos => prevPedidos.map(p =>
                    p.id === pedidoId ? pedidoOriginal : p
                ));
            } else {
                console.warn("No se encontró el pedido original para revertir estado.");
                fetchData();
            }
        } finally {
            setIsFetching(false);
        }
    };

    if (loading) return <div className={styles.loading}>Cargando monitor de cocina...</div>;

    return (
        <div className={styles.cocinaContainer}>
            <h1>Monitor de Cocina</h1>
            <MessageBox
                message={message.text}
                type={message.type}
                onClose={() => setMessage({ text: null, type: 'info' })}
            />

            {/* --- CONTROLES DE FILTRO ACTUALIZADOS --- */}
            <div className={styles.filtrosContainer}>
                {/* Filtros de Estado */}
                <div className={styles.filtroGrupo}>
                    <label>Estado Pedido:</label>
                    <div className={styles.botonesFiltroEstado}>
                        {STATUS_FILTERS.map(status => (
                            <button
                                key={status}
                                className={`${styles.botonFiltro} ${inputStatusFilter === status ? styles.activo : ''}`}
                                onClick={() => handleStatusFilterChange(status)} // Actualiza el INPUT state
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* NUEVO: Filtro por N° Pedido */}
                <div className={styles.filtroGrupo}>
                    <label htmlFor="pedidoIdSearch">N° Pedido:</label>
                    <input
                        type="number" // Cambiado a 'number' para mejor UX
                        id="pedidoIdSearch"
                        placeholder="Buscar ID..."
                        value={inputPedidoId} // Controlado por INPUT state
                        onChange={handlePedidoIdChange}
                        className={styles.filtroInput}
                    />
                </div>

                {/* Filtros de Fecha */}
                <div className={styles.filtroGrupo}>
                    <label>Fecha:</label>
                    <div className={styles.inputsFecha}>
                        <label htmlFor="desde">Desde:</label>
                        <input
                            type="date"
                            id="desde"
                            name="desde"
                            value={inputDateRange.desde} // Controlado por INPUT state
                            onChange={handleDateChange}
                            className={styles.inputFecha}
                        />
                        <label htmlFor="hasta">Hasta:</label>
                        <input
                            type="date"
                            id="hasta"
                            name="hasta"
                            value={inputDateRange.hasta} // Controlado por INPUT state
                            onChange={handleDateChange}
                            className={styles.inputFecha}
                            max={today} 
                        />
                    </div>
                </div>

                {/* NUEVO: Botones de Acción de Filtro */}
                <div className={styles.filtroAcciones}>
                    <button className={styles.botonLimpiar} onClick={handleLimpiarFiltros}>Limpiar</button>
                    <button className={styles.botonAplicar} onClick={handleAplicarFiltros}>Aplicar Filtros</button>
                </div>
            </div>

            {/* --- TABLERO DE COMANDAS --- */}
            <div className={styles.tableroComandas}>
                {filteredPedidos.length === 0 && !isFetching ? (
                    <p className={styles.noPedidos}>No hay pedidos que coincidan con los filtros.</p>
                ) : (
                    filteredPedidos.map(pedido => (
                        <ComandaCard
                            key={pedido.id}
                            pedido={pedido}
                            estadosDisponibles={estados}
                            onUpdateStatus={handleUpdateStatus}
                        />
                    ))
                )}
                {isFetching && filteredPedidos.length > 0 && <div className={styles.refreshIndicator}>Actualizando...</div>}
            </div>
        </div>
    );
};

export default CocinaPage;