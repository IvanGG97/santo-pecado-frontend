import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Asegúrate que esta ruta a tu archivo api.js sea correcta desde src/pages/Cocina/

import apiClient from '../../services/api';
// Asegúrate que este archivo CSS exista en la misma carpeta (src/pages/Cocina/)

import styles from './CocinaPage.module.css';

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

// --- Componente ComandaCard (ACTUALIZADO para mostrar cliente) ---

const ComandaCard = ({ pedido, estadosDisponibles, onUpdateStatus }) => {

    const estadoActual = estadosDisponibles.find(e => e.estado_pedido_nombre === pedido.estado_pedido) || { estado_pedido_nombre: 'Desconocido' };

    const estadosSiguientes = estadosDisponibles.filter(estado => estado.estado_pedido_nombre !== pedido.estado_pedido); // Comparar por nombre

    const cardBgClass = estadoColorMap[estadoActual.estado_pedido_nombre]

        ? styles[`estado-${estadoColorMap[estadoActual.estado_pedido_nombre]}-bg`]
        : '';

    const ESTADOS_NO_BOTON = ['Entregado', 'Pendiente']; // Estados que no deben aparecer como botón

    return (

        <div className={`${styles.comandaCard} ${cardBgClass}`}>

            <div className={styles.cardHeader}>

                <h3>Pedido #{pedido.id}</h3>

                <span className={styles.estadoActualBadge}>{estadoActual.estado_pedido_nombre}</span>
            </div>

            {/* --- NUEVO: Sección de Información del Cliente --- */}
            {pedido.cliente && ( // Solo muestra si hay un cliente asociado (objeto cliente existe)

                <div className={styles.clienteInfoSection}>

                    <span className={styles.clienteNombre}>
                        👤 {pedido.cliente.cliente_nombre} {pedido.cliente.cliente_apellido || ''}
                    </span>
                    {pedido.cliente.cliente_direccion && ( // Muestra dirección solo si existe en el objeto cliente

                        <span className={styles.clienteDireccion}>
                            📍 {pedido.cliente.cliente_direccion}
                        </span>
                    )}
                </div>
            )}
            {/* --- FIN Sección Cliente --- */}


            <div className={styles.cardBody}>

                {pedido.detalles.map((item, index) => (
                    // Clave más única
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
                <span>Cambiar estado a:</span>

                <div className={styles.botonesEstado}>

                    {estadosSiguientes.map(estado => {
                        const buttonColorClass = estadoColorMap[estado.estado_pedido_nombre]

                            ? styles[`boton-${estadoColorMap[estado.estado_pedido_nombre]}`]
                            : '';

                        if (ESTADOS_NO_BOTON.includes(estado.estado_pedido_nombre)) {
                            return null;
                        }

                        // Obtener el ID del estado para enviar al backend

                        const estadoIdParaUpdate = estadosDisponibles.find(e => e.estado_pedido_nombre === estado.estado_pedido_nombre)?.id;

                        // No mostrar botón si no se encontró el ID (seguridad)
                        if (!estadoIdParaUpdate) return null;


                        return (
                            <button

                                key={estado.id}

                                onClick={() => onUpdateStatus(pedido.id, estadoIdParaUpdate, estado.estado_pedido_nombre)} // Enviar ID correcto

                                className={`${styles.botonEstado} ${buttonColorClass}`}
                            >

                                {estado.estado_pedido_nombre}
                            </button>
                        );
                    })}
                </div>

                <small className={styles.timestamp}>

                    Recibido: {new Date(pedido.pedido_fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
            </div>
        </div>
    );
};


// --- Componente Principal CocinaPage ---
const CocinaPage = () => {
    const [allPedidos, setAllPedidos] = useState([]); // Guarda TODOS los pedidos
    const [estados, setEstados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false); // Para indicar refrescos
    const [message, setMessage] = useState({ text: null, type: 'info' });

    // Estados para Filtros
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('Recibido En Cocina'); // Estado inicial
    const [dateRange, setDateRange] = useState({ desde: '', hasta: '' });

    // Definir filtros de estado disponibles
    const STATUS_FILTERS = useMemo(() => ['Recibido En Cocina', 'En Preparación', 'Completado', 'Cancelado', 'Todos'], []);


    const showMessage = (text, type = 'info', duration = 5000) => {
        setMessage({ text, type });
        if (duration) {
            setTimeout(() => setMessage(prev => prev.text === text ? { text: null, type: 'info' } : prev), duration);
        }
    };

    // Función para buscar datos, envuelta en useCallback
    const fetchData = useCallback(async () => {
        let shouldFetch = true;
        setIsFetching(currentFetching => { // Evita llamadas concurrentes
            if (currentFetching) shouldFetch = false;
            return true;
        });
        if (!shouldFetch) return;

        try {
            const [resPedidos, resEstados] = await Promise.all([

                apiClient.get('/pedido/pedidos/'), // Trae todos los pedidos

                apiClient.get('/pedido/estados/')  // Trae los posibles estados
            ]);

            const estadosData = resEstados.data;
            setEstados(estadosData); // Guardar lista de estados

            // Procesar pedidos: añadir ID de estado para manejo interno más fácil

            const todosLosPedidos = resPedidos.data

                .map(p => ({
                    ...p,
                    // Busca el ID correspondiente al nombre del estado que viene de la API

                    estado_pedido_id: estadosData.find(e => e.estado_pedido_nombre === p.estado_pedido)?.id || null
                }))
                // Ordenar por fecha ASC (más antiguo primero)
                .sort((a, b) => new Date(a.pedido_fecha_hora) - new Date(b.pedido_fecha_hora));

            // Actualizar el estado que guarda TODOS los pedidos
            // Comparación simple para evitar re-renders si los datos no cambiaron realmente
            setAllPedidos(currentPedidos => {
                const currentSignature = JSON.stringify(currentPedidos.map(p => ({ id: p.id, estado: p.estado_pedido_id, cliente: p.cliente?.id }))); // Incluir cliente en la firma
                const newSignature = JSON.stringify(todosLosPedidos.map(p => ({ id: p.id, estado: p.estado_pedido_id, cliente: p.cliente?.id })));
                if (currentSignature !== newSignature) {
                    return todosLosPedidos; // Actualiza solo si hay cambios
                }
                return currentPedidos; // Mantiene el estado anterior si no hay cambios
            });

            setLoading(false); // Marcar como cargado después de la primera carga exitosa

        } catch (err) {
            console.error("Error fetching data:", err);
            showMessage('Error al cargar los datos.', 'error', null); // Mensaje persistente en caso de error
            setLoading(false); // Importante marcar como no cargando incluso si hay error
        } finally {
            setIsFetching(false); // Termina el indicador de refresco
        }
    }, []); // Dependencias vacías para que useCallback cree la función una sola vez


    // Carga inicial y Refresco periódico cada 5 segundos
    useEffect(() => {
        fetchData(); // Carga inicial
        const intervalId = setInterval(fetchData, 5000); // Refresca cada 5 seg
        return () => clearInterval(intervalId); // Limpia el intervalo al desmontar
    }, [fetchData]); // Depende de la función estable fetchData


    // Lógica de filtrado con useMemo
    const filteredPedidos = useMemo(() => {

        return allPedidos.filter(pedido => {
            // 1. Filtro por Estado
            // Compara el nombre del estado del pedido con el filtro seleccionado
            if (selectedStatusFilter !== 'Todos' && pedido.estado_pedido !== selectedStatusFilter) {
                return false;
            }

            // 2. Filtro por Fecha "Desde"
            if (dateRange.desde) {
                const fechaDesde = new Date(dateRange.desde);
                fechaDesde.setHours(0, 0, 0, 0); // Inicio del día

                const fechaPedido = new Date(pedido.pedido_fecha_hora);
                if (fechaPedido < fechaDesde) {
                    return false;
                }
            }

            // 3. Filtro por Fecha "Hasta"
            if (dateRange.hasta) {
                const fechaHasta = new Date(dateRange.hasta);
                fechaHasta.setHours(23, 59, 59, 999); // Fin del día

                const fechaPedido = new Date(pedido.pedido_fecha_hora);
                if (fechaPedido > fechaHasta) {
                    return false;
                }
            }

            // Si pasa todos los filtros, se incluye
            return true;
        });
    }, [allPedidos, selectedStatusFilter, dateRange]); // Recalcula si cambia alguno de estos

    // Manejador para cambio en inputs de fecha
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prevRange => ({
            ...prevRange,
            [name]: value
        }));
    };

    // Manejador para actualizar el estado de un pedido
    const handleUpdateStatus = async (pedidoId, nuevoEstadoId, nuevoEstadoNombre) => {
        let shouldUpdate = true;
        setIsFetching(currentFetching => { // Prevenir llamadas concurrentes
            if (currentFetching) shouldUpdate = false;
            return true;
        });
        if (!shouldUpdate) return;

        // Guardar estado original para posible reversión
        const pedidoOriginal = allPedidos.find(p => p.id === pedidoId);

        try {
            // Actualización optimista: Cambia el estado en la lista local inmediatamente
            setAllPedidos(prevPedidos => prevPedidos.map(p =>

                p.id === pedidoId
                    // Actualiza el ID y el nombre del estado en la copia local
                    ? { ...p, estado_pedido_id: nuevoEstadoId, estado_pedido: nuevoEstadoNombre }
                    : p
            ));

            // Llamada a la API para guardar el cambio en el backend
            await apiClient.patch(`/pedido/pedidos/${pedidoId}/`, {
                estado_pedido: nuevoEstadoId // Enviar solo el ID del nuevo estado
            });
            showMessage(`Pedido #${pedidoId} actualizado a ${nuevoEstadoNombre}.`, 'success', 3000); // Notificación de éxito

        } catch (err) {
            console.error("Error updating status:", err);
            showMessage(`Error al actualizar estado del Pedido #${pedidoId}.`, 'error'); // Notificación de error
            // Revertir cambio optimista en caso de error
            if (pedidoOriginal) {
                setAllPedidos(prevPedidos => prevPedidos.map(p =>

                    p.id === pedidoId ? pedidoOriginal : p // Vuelve al estado original guardado
                ));
            } else {
                console.warn("No se encontró el pedido original para revertir estado.");
                fetchData(); // Intenta recargar todo si no se puede revertir
            }
        } finally {
            setIsFetching(false); // Termina el indicador de proceso
        }
    };

    // Muestra pantalla de carga inicial
    if (loading) return <div className={styles.loading}>Cargando monitor de cocina...</div>;

    return (
        // Contenedor principal
        <div className={styles.cocinaContainer}>
            <h1>Monitor de Cocina</h1>
            {/* Componente para mostrar mensajes/notificaciones */}
            <MessageBox
                message={message.text}
                type={message.type}
                onClose={() => setMessage({ text: null, type: 'info' })}
            />

            {/* --- CONTROLES DE FILTRO --- */}

            <div className={styles.filtrosContainer}>
                {/* Filtros de Estado */}

                <div className={styles.filtroGrupo}>
                    <label>Filtrar por Estado:</label>

                    <div className={styles.botonesFiltroEstado}>
                        {STATUS_FILTERS.map(status => (
                            <button
                                key={status}
                                // Aplica clase 'activo' si es el filtro seleccionado
                                className={`${styles.botonFiltro} ${selectedStatusFilter === status ? styles.activo : ''}`}
                                onClick={() => setSelectedStatusFilter(status)} // Actualiza el estado del filtro al hacer clic
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filtros de Fecha */}

                <div className={styles.filtroGrupo}>
                    <label>Filtrar por Fecha:</label>

                    <div className={styles.inputsFecha}>
                        <label htmlFor="desde">Desde:</label>
                        <input
                            type="date"
                            id="desde"
                            name="desde" // Importante: coincide con la clave en dateRange
                            value={dateRange.desde}
                            onChange={handleDateChange} // Llama al manejador

                            className={styles.inputFecha}
                        />
                        <label htmlFor="hasta">Hasta:</label>
                        <input
                            type="date"
                            id="hasta"
                            name="hasta" // Importante: coincide con la clave en dateRange
                            value={dateRange.hasta}
                            onChange={handleDateChange} // Llama al manejador

                            className={styles.inputFecha}
                        />
                    </div>
                </div>
            </div>

            {/* --- TABLERO DE COMANDAS --- */}

            <div className={styles.tableroComandas}>
                {/* Muestra mensaje si no hay pedidos Y no se está actualizando */}
                {filteredPedidos.length === 0 && !isFetching ? (

                    <p className={styles.noPedidos}>No hay pedidos que coincidan con los filtros.</p>
                ) : (
                    // Mapea sobre los pedidos filtrados para renderizar las tarjetas
                    filteredPedidos.map(pedido => (
                        <ComandaCard

                            key={pedido.id}

                            pedido={pedido} // Pasa el objeto pedido completo (incluye cliente si existe)
                            estadosDisponibles={estados} // Pasa la lista de posibles estados
                            onUpdateStatus={handleUpdateStatus} // Pasa la función para cambiar estado
                        />
                    ))
                )}
                {/* Indicador visual opcional durante refrescos automáticos (si hay pedidos visibles) */}
                {isFetching && filteredPedidos.length > 0 && <div className={styles.refreshIndicator}>Actualizando...</div>}
            </div>
        </div>
    );
};

export default CocinaPage; // Asegúrate que el export sea correcto

