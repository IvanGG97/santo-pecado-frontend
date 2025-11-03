import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. IMPORTAR useNavigate
import apiClient from '../../services/api';
import styles from './VentasPage.module.css';
import Swal from 'sweetalert2';

// --- Constantes (Sin cambios) ---
const ESTADO_FINAL_PAGADO = 'Pagado';
const ESTADO_FINAL_CANCELADO = 'Cancelado';

// --- Mapeo de Colores (Sin cambios) ---
const estadoColorMap = {
    'Pagado': 'pagado',
    'Cancelado': 'cancelado',
    'No Pagado': 'pendiente',
};

// --- Opciones de Pago (Sin cambios) ---
const MEDIOS_DE_PAGO = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
];

// --- Componente Modal (Sin cambios) ---
const ManageVentaModal = ({ venta, estadosVenta, onClose, onSaveSuccess }) => {
    const [editableEstadoId, setEditableEstadoId] = useState(venta.estado_venta?.id || '');
    const [editableMedioPago, setEditableMedioPago] = useState(venta.venta_medio_pago || 'efectivo');
    const [isLoading, setIsLoading] = useState(false);

    const isReadOnly =
        venta.estado_venta?.estado_venta_nombre === ESTADO_FINAL_PAGADO ||
        venta.estado_venta?.estado_venta_nombre === ESTADO_FINAL_CANCELADO;

    const handleSaveClick = async () => {
        setIsLoading(true);
        try {
            const payload = {
                estado_venta: editableEstadoId,
                venta_medio_pago: editableMedioPago,
            };
            await apiClient.patch(`/venta/ventas/${venta.id}/`, payload);
            Swal.fire('¡Guardado!', 'La venta ha sido actualizada.', 'success');
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error("Error al guardar la venta:", error);
            Swal.fire('Error', 'No se pudo actualizar la venta.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>Detalle de Venta #{venta.id}</h2>

                <div className={styles.modalSection}>
                    <h4>Detalles del Pedido</h4>
                    <div className={styles.detalleVentaList}>
                        {venta.pedido && venta.pedido.detalles && venta.pedido.detalles.length > 0 ? (
                            venta.pedido.detalles.map((detalle) => (
                                <div key={detalle.id} className={styles.detalleVentaItem}>
                                    <span className={styles.detalleQty}>{detalle.cantidad}x</span>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.detalleNombre}>{detalle.producto_nombre || detalle.notas || 'Item'}</span>
                                        {detalle.notas && detalle.notas !== detalle.producto_nombre && (
                                            <span className={styles.notas}>↳ {detalle.notas}</span>
                                        )}
                                    </div>
                                    <span className={styles.detallePrecio}>
                                        ${new Intl.NumberFormat('es-AR').format(detalle.precio_unitario)} c/u
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p>No se encontraron detalles de pedido para esta venta.</p>
                        )}
                    </div>
                    <div className={styles.detalleTotal}>
                        <strong>Total:</strong>
                        <strong>${new Intl.NumberFormat('es-AR').format(venta.venta_total)}</strong>
                    </div>
                </div>

                <div className={styles.modalSection}>
                    <h4>Gestionar Venta</h4>
                    <div className={styles.gestionGridInfo}>
                        <div className={styles.gridItemFull}><strong>Cliente:</strong> {venta.cliente?.cliente_nombre || 'Consumidor Final'}</div>
                        <div className={styles.gridItemFull}><strong>Dirección:</strong> {venta.cliente?.cliente_direccion || 'N/A'}</div>
                        <div className={styles.gridItemFull}><strong>Empleado:</strong> {venta.empleado ? `${venta.empleado.first_name} ${venta.empleado.last_name}`.trim() : 'N/A'}</div>
                        <div className={styles.gridItem}><strong>Pedido ID:</strong> {venta.pedido?.id || 'N/A'}</div>
                        <div className={styles.gridItem}><strong>Estado Pedido:</strong> {venta.pedido?.estado_pedido || 'N/A'}</div>
                        <div className={styles.gridItemFull}><strong>Fecha:</strong> {new Date(venta.venta_fecha_hora).toLocaleString()}</div>
                    </div>

                    <div className={styles.gestionGridControls}>
                        {isReadOnly ? (
                            <>
                                <div className={styles.gridLabel}><strong>Estado:</strong></div>
                                <div>{venta.estado_venta?.estado_venta_nombre || 'N/A'}</div>
                                <div className={styles.gridLabel}><strong>Medio de Pago:</strong></div>
                                <div>{venta.venta_medio_pago}</div>
                            </>
                        ) : (
                            <>
                                <label className={styles.gridLabel}>Estado de Venta:</label>
                                <div className={styles.radioGroup}>
                                    {estadosVenta.map(estado => (
                                        <button
                                            key={estado.id}
                                            type="button"
                                            className={`${styles.radioButton} ${editableEstadoId === estado.id ? styles.radioSelected : ''}`}
                                            onClick={() => setEditableEstadoId(estado.id)}
                                            disabled={isLoading}
                                        >
                                            {estado.estado_venta_nombre}
                                        </button>
                                    ))}
                                </div>
                                <label className={styles.gridLabel}>Medio de Pago:</label>
                                <div className={styles.radioGroup}>
                                    {MEDIOS_DE_PAGO.map(metodo => (
                                        <button
                                            key={metodo.value}
                                            type="button"
                                            className={`${styles.radioButton} ${editableMedioPago === metodo.value ? styles.radioSelected : ''}`}
                                            onClick={() => setEditableMedioPago(metodo.value)}
                                            disabled={isLoading}
                                        >
                                            {metodo.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.cancelButton}>Cerrar</button>
                    {!isReadOnly && (
                        <button
                            onClick={handleSaveClick}
                            className={styles.saveButton}
                            disabled={isLoading}
                            á   >
                            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    )}
                    {isReadOnly && <small className={styles.readOnlyText}>Esta venta está finalizada y no se puede editar.</small>}
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal VentasPage (Actualizado con Filtros) ---
const VentasPage = () => {
    const [allVentas, setAllVentas] = useState([]);
    const [estadosVenta, setEstadosVenta] = useState([]);
    const [loading, setLoading] = useState(true); // Este 'loading' es para los datos de ventas
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState(null);

    // --- 2. NUEVOS ESTADOS PARA VERIFICACIÓN ---
    const [isVerifyingCaja, setIsVerifyingCaja] = useState(true);
    const navigate = useNavigate();
    // --- FIN DE NUEVOS ESTADOS ---

    // --- ESTADOS PARA LOS INPUTS DE FILTRO (Sin cambios) ---
    const [inputStatusFilter, setInputStatusFilter] = useState('No Pagado');
    const [inputEmpleadoSearch, setInputEmpleadoSearch] = useState('');
    const [inputDateRange, setInputDateRange] = useState({ desde: '', hasta: '' });

    // --- ESTADO PARA LOS FILTROS APLICADOS (Sin cambios) ---
    const [activeFilters, setActiveFilters] = useState({
        status: 'No Pagado',
        empleado: '',
        desde: '',
        hasta: '',
    });

    const STATUS_FILTERS = useMemo(() => ['No Pagado', 'Pagado', 'Cancelado', 'Todos'], []);

    // Función de carga (Sin cambios)
    const fetchVentasYEstados = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        try {
            const [resVentas, resEstados] = await Promise.all([
                apiClient.get('/venta/ventas/'),
                apiClient.get('/venta/estados-venta/')
            ]);
            setAllVentas(resVentas.data.sort((a, b) => new Date(b.venta_fecha_hora) - new Date(a.venta_fecha_hora)));
            setEstadosVenta(resEstados.data);
            setError(null);
        } catch (error) {
            console.error("Error al cargar datos de ventas:", error);
            setError("No se pudieron cargar los datos de ventas.");
            if (isInitialLoad) {
                Swal.fire('Error', 'No se pudieron cargar los datos de ventas.', 'error');
            }
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);


    // --- 3. NUEVO useEffect PARA VERIFICAR LA CAJA ---
    useEffect(() => {
        const checkCajaStatus = async () => {
            try {
                const res = await apiClient.get('/caja/estado/');
                // Si la caja está abierta (estado es true)
                if (res.data && res.data.caja_estado === true) {
                    setIsVerifyingCaja(false); // Permite la carga de la página
                } else {
                    // Si la caja está cerrada
                    Swal.fire({
                        title: 'Caja Cerrada',
                        text: 'Para entrar a esta seccion primero debes abrir una caja',
                        icon: 'warning',
                        confirmButtonText: 'Ir a Cajas',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                    }).then((result) => {
                        if (result.isConfirmed) {
                            navigate('/cajas'); // Redirige a Cajas
                        }
                    });
                }
            } catch (err) {
                // Error de red (ej. API caída)
                console.error("Error al verificar estado de caja:", err);
                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo verificar el estado de la caja. Intente más tarde.',
                    icon: 'error',
                    confirmButtonText: 'Ir a Inicio',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                }).then(() => {
                    navigate('/inicio'); // Redirige a Inicio
                });
            }
        };

        checkCajaStatus();
    }, [navigate]);
    // --- FIN DEL NUEVO useEffect ---


    // 4. MODIFICACIÓN Carga inicial (depende de la verificación)
    useEffect(() => {
        // Solo carga las ventas si la verificación de caja fue exitosa
        if (!isVerifyingCaja) {
            fetchVentasYEstados(true);
        }
    }, [fetchVentasYEstados, isVerifyingCaja]); // Añadida dependencia


    // --- LÓGICA DE FILTRADO COMBINADO (Sin cambios) ---
    const filteredVentas = useMemo(() => {
        const termEmpleado = activeFilters.empleado.toLowerCase().trim();
        return allVentas.filter(venta => {
            if (activeFilters.status !== 'Todos' && venta.estado_venta?.estado_venta_nombre !== activeFilters.status) {
                return false;
            }
            if (termEmpleado) {
                const nombreCompleto = `${venta.empleado?.first_name || ''} ${venta.empleado?.last_name || ''}`.toLowerCase().trim();
                if (!nombreCompleto.includes(termEmpleado)) {
                    return false;
                }
            }
            if (activeFilters.desde) {
                try {
                    const fechaDesde = new Date(activeFilters.desde);
                    fechaDesde.setHours(0, 0, 0, 0);
                    const fechaVenta = new Date(venta.venta_fecha_hora);
                    if (fechaVenta < fechaDesde) {
                        return false;
                    }
                } catch (e) { console.warn("Fecha 'desde' inválida:", activeFilters.desde); }
            }
            if (activeFilters.hasta) {
                try {
                    const fechaHasta = new Date(activeFilters.hasta);
                    fechaHasta.setHours(23, 59, 59, 999);
                    const fechaVenta = new Date(venta.venta_fecha_hora);
                    if (fechaVenta > fechaHasta) {
                        return false;
                    }
                } catch (e) { console.warn("Fecha 'hasta' inválida:", activeFilters.hasta); }
            }
            return true;
        });
    }, [allVentas, activeFilters]);

    // --- Handlers para filtros (Sin cambios) ---
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setInputDateRange(prevRange => ({
            ...prevRange,
            [name]: value
        }));
    };

    const handleEmpleadoSearchChange = (e) => {
        setInputEmpleadoSearch(e.target.value);

    };

    const handleAplicarFiltros = () => {
        setActiveFilters({
            status: inputStatusFilter,
            empleado: inputEmpleadoSearch,
            desde: inputDateRange.desde,
            hasta: inputDateRange.hasta
        });
    };

    const handleLimpiarFiltros = () => {
        setInputStatusFilter('No Pagado');
        setInputEmpleadoSearch('');
        setInputDateRange({ desde: '', hasta: '' });
        setActiveFilters({
            status: 'No Pagado',
            empleado: '',
            desde: '',
            hasta: ''
        });
    };

    // --- Handlers del Modal (sin cambios) ---
    const handleManageClick = (venta) => {
        setSelectedVenta(venta);
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedVenta(null);
    };
    const handleSaveVenta = () => {
        handleCloseModal();
        fetchVentasYEstados(false);
    };

    // --- 5. NUEVO RENDERIZADO DE VERIFICACIÓN ---
    if (isVerifyingCaja) {
        // Muestra un loader simple mientras verifica la caja
        return (
            <div className={styles.ventasContainer} style={{ padding: '2rem', textAlign: 'center' }}>
                Verificando estado de la caja...
            </div>
        );
    }
    // --- FIN DE NUEVO RENDERIZADO ---


    // --- Renderizado (Sin cambios en el JSX, solo se muestra si isVerifyingCaja es false) ---
    return (
        <div className={styles.ventasContainer}>
            <h1>Gestión de Ventas</h1>

            <div className={styles.filtrosContainer}>
                <div className={styles.filtroGrupo}>
                    <label>Estado Venta:</label>
                    <div className={styles.botonesFiltroEstado}>
                        {STATUS_FILTERS.map(status => (
                            <button
                                key={status}
                                className={`${styles.botonFiltro} ${inputStatusFilter === status ? styles.activo : ''}`}
                                onClick={() => setInputStatusFilter(status)}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.filtroGrupo}>
                    <label htmlFor="empleadoSearch">Empleado:</label>
                    <input
                        type="text"
                        section id="empleadoSearch"
                        placeholder="Nombre o Apellido..."
                        value={inputEmpleadoSearch}
                        onChange={handleEmpleadoSearchChange}
                        className={styles.filtroInput}
                    />
                </div>

                <div className={styles.filtroGrupo}>
                    <label>Fecha:</label>
                    <div className={styles.inputsFecha}>
                        <label htmlFor="desde">Desde:</label>
                        <input
                            type="date"
                            id="desde"
                            name="desde"
                            value={inputDateRange.desde}
                            á onChange={handleDateChange}
                            className={styles.inputFecha}
                        />
                        <label htmlFor="hasta">Hasta:</label>
                        <input
                            type="date"
                            id="hasta"
                            name="hasta"
                            value={inputDateRange.hasta}
                            onChange={handleDateChange}
                            className={styles.inputFecha}
                        />
                    </div>
                </div>

                <div className={styles.filtroAcciones}>
                    <button className={styles.botonLimpiar} onClick={handleLimpiarFiltros}>Limpiar</button>
                    <button className={styles.botonAplicar} onClick={handleAplicarFiltros}>Aplicar Filtros</button>
                </div>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <p>Cargando ventas...</p>
                ) : error ? (
                    <p className={styles.errorText}>{error}</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID Venta</th>
                                <th>ID Pedido</th>
                                <th>Estado Pedido</th>
                                <th>Fecha y Hora</th>
                                <th>Cliente</th>
                                <th>Empleado</th>
                                <th>Total</th>
                                <th>Medio de Pago</th>
                                <th>Estado Venta</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVentas.length === 0 ? (
                                <tr>
                                    <td colSpan={10} style={{ textAlign: 'center' }}>No se encontraron ventas que coincidan con los filtros.</td>
                                </tr>
                            ) : (
                                filteredVentas.map(venta => {
                                    const estadoNombreVenta = venta.estado_venta?.estado_venta_nombre || 'N/A';
                                    const isReadOnly = estadoNombreVenta === ESTADO_FINAL_PAGADO || estadoNombreVenta === ESTADO_FINAL_CANCELADO;
                                    const estadoNombrePedido = venta.pedido?.estado_pedido || 'N/A';

                                    return (
                                        <tr key={venta.id} className={isReadOnly ? styles.readOnlyRow : ''}>
                                            <td>{venta.id}</td>
                                            <td>{venta.pedido?.id || 'N/A'}</td>
                                            <td>{estadoNombrePedido}</td>
                                            <td>{new Date(venta.venta_fecha_hora).toLocaleString()}</td>
                                            <td>{venta.cliente?.cliente_nombre || 'Consumidor Final'}</td>
                                            <td>{venta.empleado ? `${venta.empleado.first_name} ${venta.empleado.last_name}`.trim() : 'N/A'}</td>
                                            <td>${new Intl.NumberFormat('es-AR').format(venta.venta_total)}</td>
                                            <td>{venta.venta_medio_pago || 'N/A'}</td>
                                            <td>
                                                <span className={`${styles.estadoBadge} ${styles[estadoColorMap[estadoNombreVenta] || 'default']}`}>
                                                    {estadoNombreVenta}
                                                </span>
                                            </td>
                                            <td className={styles.actions}>
                                                <button
                                                    className={`${styles.manageButton} ${isReadOnly ? styles.viewOnlyButton : ''}`}
                                                    onClick={() => handleManageClick(venta)}
                                                >
                                                    {isReadOnly ? 'Ver Detalles' : 'Gestionar Venta'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && selectedVenta && (
                <ManageVentaModal
                    venta={selectedVenta}
                    estadosVenta={estadosVenta}
                    onClose={handleCloseModal}
                    onSaveSuccess={handleSaveVenta}
                />
            )}
        </div>
    );
};

export default VentasPage;