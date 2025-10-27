import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Asegúrate que esta ruta a tu archivo api.js sea correcta desde src/pages/Cocina/
import apiClient from '../../services/api';
// Asegúrate que este archivo CSS exista en la misma carpeta (src/pages/Cocina/)
import styles from './CocinaPage.module.css';

// --- Componente Simple de Mensajes ---
const MessageBox = ({ message, type, onClose }) => {
    // ... (mismo código que antes)
    if (!message) return null;
    return (
        <div className={`${styles.messageBox} ${type === 'error' ? styles.error : styles.success}`}>
            <p>{message}</p>
            <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
    );
};

// --- Mapeo de Nombres de Estado a Clases CSS (ACTUALIZADO) ---
// Asegúrate que los nombres coincidan EXACTAMENTE con los de tu BD
const estadoColorMap = {
    'Recibido En Cocina': 'recibido',
    'En Preparación': 'en-proceso',
    'Completado': 'completado',
    'Cancelado': 'cancelado'
    // Puedes añadir otros si los necesitas para los botones, aunque no se filtren
};

// --- Componente ComandaCard ---
const ComandaCard = ({ pedido, estadosDisponibles, onUpdateStatus }) => {
    // ... (lógica interna de ComandaCard - se mantiene igual, PERO se ajustan los botones)
    const estadoActual = estadosDisponibles.find(e => e.id === pedido.estado_pedido_id) || { estado_pedido_nombre: 'Desconocido' };
    // Botones disponibles: todos excepto el actual. Se incluyen 'Completado' y 'Cancelado' aquí.
    const estadosSiguientes = estadosDisponibles.filter(estado => estado.id !== pedido.estado_pedido_id);

    const cardBgClass = estadoColorMap[estadoActual.estado_pedido_nombre]
        ? styles[`estado-${estadoColorMap[estadoActual.estado_pedido_nombre]}-bg`]
        : '';

     // Estados que NO deben aparecer como botón para cambiar
     const ESTADOS_NO_BOTON = ['Entregado', 'Pendiente']; // Ajusta si tienes otros

    return (
        <div className={`${styles.comandaCard} ${cardBgClass}`}>
             <div className={styles.cardHeader}>
                <h3>Pedido #{pedido.id}</h3>
                <span className={styles.estadoActualBadge}>{estadoActual.estado_pedido_nombre}</span>
            </div>
            <div className={styles.cardBody}>
                {pedido.detalles.map((item, index) => (
                    <div key={`${pedido.id}-${index}`} className={styles.detalleItem}>
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

                        // No mostrar botones para estados irrelevantes en cocina
                        if (ESTADOS_NO_BOTON.includes(estado.estado_pedido_nombre)) {
                            return null;
                        }

                        return (
                            <button
                                key={estado.id}
                                onClick={() => onUpdateStatus(pedido.id, estado.id, estado.estado_pedido_nombre)}
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
    const [isFetching, setIsFetching] = useState(false);
    const [message, setMessage] = useState({ text: null, type: 'info' });

    // --- NUEVOS ESTADOS PARA FILTROS ---
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('Recibido En Cocina'); // Estado inicial
    const [dateRange, setDateRange] = useState({ desde: '', hasta: '' });

    // Los nombres exactos de los estados que quieres usar para filtrar
    const STATUS_FILTERS = ['Recibido En Cocina', 'En Preparación', 'Completado', 'Cancelado', 'Todos'];

    const showMessage = (text, type = 'info', duration = 5000) => {
        // ... (misma función que antes)
        setMessage({ text, type });
        if (duration) {
            setTimeout(() => setMessage(prev => prev.text === text ? { text: null, type: 'info' } : prev), duration);
        }
    };

    // fetchData ahora trae TODOS los pedidos y no filtra por estado final
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

            // Mapear y añadir ID de estado, SIN FILTRAR por estado final aquí
            const todosLosPedidos = resPedidos.data
                .map(p => ({
                    ...p,
                    // Asegúrate que el estado_pedido_nombre exista antes de buscar el ID
                    estado_pedido_id: p.estado_pedido ? (estadosData.find(e => e.estado_pedido_nombre === p.estado_pedido)?.id || null) : null
                }))
                // Ordenar siempre por fecha ASC (más antiguo primero)
                .sort((a, b) => new Date(a.pedido_fecha_hora) - new Date(b.pedido_fecha_hora));

            // Actualizar el estado que guarda TODOS los pedidos
            setAllPedidos(currentPedidos => {
                const currentSignature = JSON.stringify(currentPedidos.map(p => ({ id: p.id, estado: p.estado_pedido_id })));
                const newSignature = JSON.stringify(todosLosPedidos.map(p => ({ id: p.id, estado: p.estado_pedido_id })));
                if (currentSignature !== newSignature) {
                    return todosLosPedidos;
                }
                return currentPedidos;
            });

             setLoading(currentLoading => currentLoading ? false : false);

        } catch (err) {
            console.error("Error fetching data:", err);
            showMessage('Error al cargar los datos.', 'error', null);
            setLoading(currentLoading => currentLoading ? false : false);
        } finally {
             setIsFetching(false);
        }
    }, []); // Dependencias vacías


    // Carga inicial y Refresco periódico
    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000);
        return () => clearInterval(intervalId);
    }, [fetchData]);


    // --- LÓGICA DE FILTRADO ---
    const filteredPedidos = useMemo(() => {
        return allPedidos.filter(pedido => {
            // 1. Filtro por Estado
            if (selectedStatusFilter !== 'Todos' && pedido.estado_pedido !== selectedStatusFilter) {
                return false;
            }

            // 2. Filtro por Fecha "Desde"
            if (dateRange.desde) {
                const fechaDesde = new Date(dateRange.desde);
                // Ajustar para que incluya todo el día
                fechaDesde.setHours(0, 0, 0, 0);
                const fechaPedido = new Date(pedido.pedido_fecha_hora);
                if (fechaPedido < fechaDesde) {
                    return false;
                }
            }

            // 3. Filtro por Fecha "Hasta"
            if (dateRange.hasta) {
                const fechaHasta = new Date(dateRange.hasta);
                // Ajustar para que incluya todo el día
                fechaHasta.setHours(23, 59, 59, 999);
                const fechaPedido = new Date(pedido.pedido_fecha_hora);
                if (fechaPedido > fechaHasta) {
                    return false;
                }
            }

            // Si pasa todos los filtros, se incluye
            return true;
        });
    }, [allPedidos, selectedStatusFilter, dateRange]);

    // --- MANEJO DE CAMBIO DE FECHA ---
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prevRange => ({
            ...prevRange,
            [name]: value
        }));
    };

    // handleUpdateStatus ahora actualiza allPedidos
    const handleUpdateStatus = async (pedidoId, nuevoEstadoId, nuevoEstadoNombre) => {
        let shouldUpdate = true;
         setIsFetching(currentFetching => {
            if (currentFetching) shouldUpdate = false;
            return true;
         });
         if (!shouldUpdate) return;

        const pedidoOriginal = allPedidos.find(p => p.id === pedidoId);

        try {
            // Actualización optimista en la lista completa
            setAllPedidos(prevPedidos => prevPedidos.map(p =>
                p.id === pedidoId
                    ? { ...p, estado_pedido_id: nuevoEstadoId, estado_pedido: nuevoEstadoNombre }
                    : p
            ));

            await apiClient.patch(`/pedido/pedidos/${pedidoId}/`, {
                estado_pedido: nuevoEstadoId
            });
            showMessage('Estado actualizado.', 'success', 3000);

        } catch (err) {
            console.error("Error updating status:", err);
            showMessage('Error al actualizar estado.', 'error');
            // Revertir en la lista completa
            if (pedidoOriginal) {
                setAllPedidos(prevPedidos => prevPedidos.map(p =>
                    p.id === pedidoId ? pedidoOriginal : p
                ));
            } else {
                 console.warn("No se encontró el pedido original para revertir estado.");
            }
        } finally {
            setIsFetching(false);
        }
    };

    if (loading) return <div className={styles.loading}>Cargando pedidos...</div>;

    return (
        <div className={styles.cocinaContainer}>
            <h1>Monitor de Cocina</h1>
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
                                className={`${styles.botonFiltro} ${selectedStatusFilter === status ? styles.activo : ''}`}
                                onClick={() => setSelectedStatusFilter(status)}
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
                            name="desde"
                            value={dateRange.desde}
                            onChange={handleDateChange}
                            className={styles.inputFecha}
                        />
                        <label htmlFor="hasta">Hasta:</label>
                        <input
                            type="date"
                            id="hasta"
                            name="hasta"
                            value={dateRange.hasta}
                            onChange={handleDateChange}
                            className={styles.inputFecha}
                        />
                    </div>
                </div>
            </div>

            {/* --- TABLERO DE COMANDAS (USA filteredPedidos) --- */}
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
                 {isFetching && allPedidos.length > 0 && <div className={styles.refreshIndicator}>Actualizando...</div>}
            </div>
        </div>
    );
};

export default CocinaPage;

