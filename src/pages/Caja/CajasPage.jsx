import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../services/api';
import styles from './CajasPage.module.css';
import Swal from 'sweetalert2';

// --- Helpers de Fecha ---
const getToday = () => new Date().toISOString().split('T')[0];
const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

// --- Constantes de Filtro ---
const ESTADOS_CAJA = [
    { value: 'todos', label: 'Todos' },
    { value: 'abierta', label: 'Abierta' },
    { value: 'cerrada', label: 'Cerrada' }
];

const formatCurrency = (value) => new Intl.NumberFormat('es-AR').format(value || 0);

// --- Iconos ---
const IconoIngreso = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-plus-circle-fill" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z" />
    </svg>
);
const IconoEgreso = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-dash-circle-fill" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z" />
    </svg>
);

// --- Formulario para ABRIR Caja ---
const AbrirCajaForm = ({ onCajaAbierta, montoSugerido, esPrimeraCaja }) => {
    const [montoInicial, setMontoInicial] = useState(esPrimeraCaja ? '' : (montoSugerido || 0).toString());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        let montoPayload = {};

        if (esPrimeraCaja) {
            const monto = parseFloat(montoInicial);
            if (isNaN(monto) || monto < 0) {
                setError("El monto inicial debe ser un número válido.");
                setIsLoading(false);
                return;
            }
            montoPayload = { caja_monto_inicial: monto };
        } else {
            montoPayload = {};
        }

        try {
            const response = await apiClient.post('/caja/abrir/', montoPayload);
            Swal.fire('¡Éxito!', 'La caja se ha abierto correctamente.', 'success');
            onCajaAbierta(response.data);
        } catch (err) {
            const errorMsg = err.response?.data?.detail || err.response?.data?.caja_monto_inicial?.[0] || "No se pudo abrir la caja.";
            setError(errorMsg);
            Swal.fire('Error', errorMsg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.abrirCajaContainer}>
            <h2>Abrir Caja</h2>
            {esPrimeraCaja ? (
                <>
                    <p>Es la primera vez que se abre la caja. Ingresa el monto inicial.</p>
                    <form onSubmit={handleSubmit} className={styles.abrirCajaForm}>
                        <div className={styles.formGroup}>
                            <label htmlFor="montoInicial">Monto Inicial ($)</label>
                            <input
                                type="number"
                                id="montoInicial"
                                value={montoInicial}
                                onChange={(e) => setMontoInicial(e.target.value)}
                                className={styles.input}
                                placeholder="Ej: 5000.00"
                                step="0.01"
                                min="0"
                                required
                                autoFocus
                            />
                        </div>
                        {error && <p className={styles.errorText}>{error}</p>}
                        <button type="submit" className={styles.abrirButton} disabled={isLoading}>
                            {isLoading ? 'Abriendo...' : 'Abrir Caja'}
                        </button>
                    </form>
                </>
            ) : (
                <>
                    <p>El monto inicial se tomará del saldo final de la caja anterior:</p>
                    <div className={styles.montoSugerido}>
                        ${new Intl.NumberFormat('es-AR').format(montoSugerido)}
                    </div>
                    {error && <p className={styles.errorText}>{error}</p>}
                    <button onClick={handleSubmit} className={styles.abrirButton} disabled={isLoading}>
                        {isLoading ? 'Abriendo...' : 'Confirmar y Abrir Caja'}
                    </button>
                </>
            )}
        </div>
    );
};

// --- Modal para INGRESOS/EGRESOS ---
const MovimientoModal = ({ tipo, cajaId, onClose, onMovimientoSuccess }) => {
    const [monto, setMonto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const endpoint = tipo === 'ingreso' ? '/movimiento_caja/ingresos/' : '/movimiento_caja/egresos/';
    const title = tipo === 'ingreso' ? 'Registrar Ingreso Manual' : 'Registrar Egreso Manual';

    const handleMontoChange = (e) => {
        const val = e.target.value;
        if (val === '') {
            setMonto('');
            return;
        }
        if (parseFloat(val) >= 0) {
            setMonto(val);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            setError("El monto debe ser un número positivo mayor a 0.");
            setIsLoading(false);
            return;
        }
        if (!descripcion) {
            setError("La descripción es obligatoria.");
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                [`${tipo}_descripcion`]: descripcion,
                [`${tipo}_monto`]: montoNum,
            };
            await apiClient.post(`${endpoint}?caja_id=${cajaId}`, payload);

            Swal.fire('¡Éxito!', `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} registrado.`, 'success');
            onMovimientoSuccess();
            onClose();
        } catch (err) {
            console.error(`Error registrando ${tipo}:`, err.response?.data || err);
            const errorMsg = err.response?.data?.detail || `No se pudo registrar el ${tipo}.`;
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <div className={styles.closeButtonModalContainer}>
                    <button onClick={onClose} className={styles.closeButtonModal} disabled={isLoading}>&times;</button>
                </div>

                <h2>{title}</h2>
                <form onSubmit={handleSubmit} className={styles.formSimple}>
                    {error && <p className={styles.errorText}>{error}</p>}
                    
                    <div className={styles.formGroup}>
                        <label>Descripción</label>
                        <input
                            type="text"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className={styles.input}
                            placeholder="Ej: Pago a repartidor, ajuste..."
                            required
                            autoFocus
                            maxLength={200} 
                        />
                        <small className={styles.charCounter}>{descripcion.length} / 200</small>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Monto ($)</label>
                        <input
                            type="number"
                            value={monto}
                            onChange={handleMontoChange}
                            className={styles.input}
                            placeholder="Ej: 500.00"
                            step="0.01"
                            min="0.01"
                            required
                        />
                    </div>

                    <div className={styles.buttons}>
                        <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isLoading}>
                            Cancelar
                        </button>
                        <button type="submit" className={tipo === 'ingreso' ? styles.saveButton : styles.deleteButton} disabled={isLoading}>
                            {isLoading ? 'Guardando...' : `Guardar ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Modal Detalle de Caja ---
const CajaDetalleModal = ({ cajaInicial, onClose, onCerrarCajaClick, onHistorialRefresh }) => {
    const [caja, setCaja] = useState(cajaInicial);
    const [movimientos, setMovimientos] = useState({ ingresos: [], egresos: [] });
    const [loadingMov, setLoadingMov] = useState(true);
    const [activeTab, setActiveTab] = useState('ingresos');
    const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
    const [modalTipo, setModalTipo] = useState('ingreso');

    const isReadOnly = !caja.caja_estado;

    const fetchMovimientos = useCallback(async () => {
        if (!caja.id) return;
        setLoadingMov(true);
        try {
            const [resIngresos, resEgresos] = await Promise.all([
                apiClient.get(`/movimiento_caja/ingresos/?caja_id=${caja.id}`),
                apiClient.get(`/movimiento_caja/egresos/?caja_id=${caja.id}`)
            ]);
            setMovimientos({
                ingresos: resIngresos.data,
                egresos: resEgresos.data
            });
        } catch (err) {
            console.error("Error cargando movimientos:", err);
        } finally {
            setLoadingMov(false);
        }
    }, [caja.id]);

    useEffect(() => {
        fetchMovimientos();
    }, [fetchMovimientos]);

    const refreshCajaData = async () => {
        try {
            const resHistorial = await apiClient.get('/caja/historial/');
            const cajaActualizada = resHistorial.data.find(c => c.id === caja.id);
            if (cajaActualizada) {
                setCaja(cajaActualizada); 
            }
            if (onHistorialRefresh) {
                onHistorialRefresh();
            }
        } catch (error) {
            console.error("Error refrescando datos del modal:", error);
        }
    };

    const handleOpenMovimientoModal = (tipo) => {
        setModalTipo(tipo);
        setIsMovimientoModalOpen(true);
    };

    const handleMovimientoExitoso = () => {
        fetchMovimientos(); 
        refreshCajaData(); 
    };

    const handleCerrarClick = () => {
        if (onCerrarCajaClick) {
            onCerrarCajaClick();
        }
        onClose(); 
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={`${styles.modalContent} ${styles.modalDetalleLg}`}>
                <div className={styles.closeButtonModalContainer}>
                    <button onClick={onClose} className={styles.closeButtonModal}>&times;</button>
                </div>

                <div className={styles.detalleContainer}>
                    <div className={styles.detalleHeader}>
                        <h3>Detalle de Caja N°{caja.id}</h3>
                        <div className={styles.infoGrid}>
                            <div><span>Apertura:</span> <strong>{new Date(caja.caja_fecha_hora_apertura).toLocaleString()}</strong></div>
                            <div><span>Empleado:</span> <strong>{caja.empleado?.first_name || 'N/A'} {caja.empleado?.last_name || ''}</strong></div>
                            <div className={styles.estadoBadgeFlotante}>
                                {isReadOnly ? (
                                    <span className={styles.estadoCerrada}>Cerrada</span>
                                ) : (
                                    <span className={styles.estadoAbierta}>Abierta</span>
                                )}
                            </div>
                        </div>

                        <div className={styles.resumenFinanciero}>
                            <div className={styles.resumenColumna}>
                                <h4>Resumen de Efectivo</h4>
                                <div className={styles.resumenItem}><span>(+) Monto Inicial:</span> <strong>${formatCurrency(caja.caja_monto_inicial)}</strong></div>
                                <div className={styles.resumenItem}><span>(+) Ventas (Efectivo):</span> <strong>${formatCurrency(caja.total_ventas_efectivo)}</strong></div>
                                <div className={styles.resumenItem}><span>(+) Ingresos Manuales:</span> <strong>${formatCurrency(caja.total_ingresos_manuales)}</strong></div>
                                <div className={styles.resumenItem}><span>(-) Compras (Efectivo):</span> <strong className={styles.negativo}>-${formatCurrency(caja.total_compras_efectivo)}</strong></div>
                                <div className={styles.resumenItem}><span>(-) Egresos Manuales:</span> <strong className={styles.negativo}>-${formatCurrency(caja.total_egresos_manuales)}</strong></div>
                                <div className={`${styles.resumenItem} ${styles.resumenTotal}`}>
                                    <span>(=) Efectivo Esperado:</span>
                                    <strong>${formatCurrency(caja.saldo_calculado_efectivo)}</strong>
                                </div>
                            </div>
                            <div className={styles.resumenColumna}>
                                <h4>Resumen de Transferencias</h4>
                                <div className={styles.resumenItem}><span>(+) Ventas (Transf.):</span> <strong>${formatCurrency(caja.total_ventas_transferencia)}</strong></div>
                                <div className={styles.resumenItem}><span>(-) Compras (Transf.):</span> <strong className={styles.negativo}>-${formatCurrency(caja.total_compras_transferencia)}</strong></div>
                                <div className={`${styles.resumenItem} ${styles.resumenTotal}`}>
                                    <span>(=) Neto Transferencias:</span>
                                    <strong>${formatCurrency(caja.saldo_calculado_transferencia)}</strong>
                                </div>
                            </div>
                        </div>

                        {!isReadOnly && (
                            <button className={styles.cerrarCajaButton} onClick={handleCerrarClick}>
                                Cerrar Caja
                            </button>
                        )}
                    </div>

                    <div className={styles.movimientosTabs}>
                        <button
                            className={activeTab === 'ingresos' ? styles.tabActivo : ''}
                            onClick={() => setActiveTab('ingresos')}
                        >
                            Ingresos (Incl. Ventas)
                        </button>
                        <button
                            className={activeTab === 'egresos' ? styles.tabActivo : ''}
                            onClick={() => setActiveTab('egresos')}
                        >
                            Egresos (Incl. Compras)
                        </button>
                    </div>

                    <div className={styles.movimientosContent}>
                        {loadingMov ? (
                            <p>Cargando movimientos...</p>
                        ) : (
                            activeTab === 'ingresos' ? (
                                <div className={styles.movimientoColumna}>
                                    {!isReadOnly && (
                                        <button
                                            className={`${styles.movimientoAddButton} ${styles.saveButton}`}
                                            onClick={() => handleOpenMovimientoModal('ingreso')}
                                        >
                                            <IconoIngreso /> Registrar Ingreso Manual
                                        </button>
                                    )}
                                    <div className={styles.movimientoList}>
                                        <h4>Ingresos Registrados</h4>
                                        {movimientos.ingresos.length === 0 ? (
                                            <p className={styles.noMovimientos}>Sin ingresos.</p>
                                        ) : (
                                            movimientos.ingresos.map(mov => (
                                                <div key={mov.id} className={`${styles.movimientoItem} ${styles.ingreso} ${mov.tipo.toLowerCase()}`}>
                                                    <span>{mov.descripcion} (<i>{mov.tipo}</i>)</span>
                                                    <strong>+${formatCurrency(mov.monto)}</strong>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.movimientoColumna}>
                                    {!isReadOnly && (
                                        <button
                                            className={`${styles.movimientoAddButton} ${styles.deleteButton}`}
                                            onClick={() => handleOpenMovimientoModal('egreso')}
                                        >
                                            <IconoEgreso /> Registrar Egreso Manual
                                        </button>
                                    )}
                                    <div className={styles.movimientoList}>
                                        <h4>Egresos Registrados</h4>
                                        {movimientos.egresos.length === 0 ? (
                                            <p className={styles.noMovimientos}>Sin egresos.</p>
                                        ) : (
                                            movimientos.egresos.map(mov => (
                                                <div key={mov.id} className={`${styles.movimientoItem} ${styles.egreso} ${mov.tipo.toLowerCase()}`}>
                                                    <span>{mov.descripcion} (<i>{mov.tipo}</i>)</span>
                                                    <strong>-${formatCurrency(mov.monto)}</strong>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {isMovimientoModalOpen && !isReadOnly && (
                    <MovimientoModal
                        tipo={modalTipo}
                        cajaId={caja.id}
                        onClose={() => setIsMovimientoModalOpen(false)}
                        onMovimientoSuccess={handleMovimientoExitoso}
                    />
                )}
            </div>
        </div>
    );
};


// --- Modal Confirmar Cierre ---
const CerrarCajaModal = ({ caja, onClose, onConfirm }) => {
    const [observacion, setObservacion] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirmClick = async () => {
        setIsLoading(true);
        await onConfirm(observacion);
        setIsLoading(false);
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <div className={styles.closeButtonModalContainer}>
                    <button onClick={onClose} className={styles.closeButtonModal} disabled={isLoading}>&times;</button>
                </div>
                
                <h2>Confirmar Cierre de Caja</h2>
                <p>Estás cerrando la <strong>Caja N°{caja.id}</strong>.</p>
                <p>El sistema usará el siguiente cálculo de efectivo para el Saldo Final:</p>

                <div className={styles.cierreResumenContainer}>
                    <div className={styles.resumenItem}><span>Monto Inicial:</span> <strong>${formatCurrency(caja.caja_monto_inicial)}</strong></div>
                    <div className={styles.resumenItem}><span>(+) Ventas (Efectivo):</span> <strong>${formatCurrency(caja.total_ventas_efectivo)}</strong></div>
                    <div className={styles.resumenItem}><span>(+) Ingresos Manuales:</span> <strong>${formatCurrency(caja.total_ingresos_manuales)}</strong></div>
                    <div className={styles.resumenItem}><span>(-) Compras (Efectivo):</span> <strong className={styles.negativo}>-${formatCurrency(caja.total_compras_efectivo)}</strong></div>
                    <div className={styles.resumenItem}><span>(-) Egresos Manuales:</span> <strong className={styles.negativo}>-${formatCurrency(caja.total_egresos_manuales)}</strong></div>
                    <div className={`${styles.resumenItem} ${styles.resumenTotal}`}>
                        <span>(=) Saldo Final Esperado:</span>
                        <strong>${formatCurrency(caja.saldo_calculado_efectivo)}</strong>
                    </div>
                </div>

                <form className={styles.formSimple} style={{ marginTop: '1.5rem' }}>
                    <div className={styles.formGroup}>
                        <label>Observación (Opcional)</label>
                        <textarea
                            className={styles.textarea}
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            placeholder="Añade notas sobre el cierre..."
                            rows={3}
                            maxLength={200} 
                        />
                        <small className={styles.charCounter}>{observacion.length} / 200</small>
                    </div>
                </form>

                <div className={styles.buttons}>
                    <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isLoading}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className={styles.deleteButton}
                        disabled={isLoading}
                        onClick={handleConfirmClick}
                    >
                        {isLoading ? 'Cerrando...' : 'Confirmar y Cerrar Caja'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL CAJAS PAGE (CORREGIDO) ---
const CajasPage = () => {
    const [cajaAbierta, setCajaAbierta] = useState(null);
    const [cajasHistorial, setCajasHistorial] = useState([]);
    const [detalleModalCaja, setDetalleModalCaja] = useState(null);
    const [montoSugeridoApertura, setMontoSugeridoApertura] = useState(0);
    const [isPrimeraCaja, setIsPrimeraCaja] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    const [isCerrarModalOpen, setIsCerrarModalOpen] = useState(false);
    const [cajaParaCerrar, setCajaParaCerrar] = useState(null);

    // --- ESTADOS DE FILTRO ---
    const [inputDateRange, setInputDateRange] = useState({ desde: getYesterday(), hasta: getToday() });
    const [inputSortOrder, setInputSortOrder] = useState('desc');
    const [inputIdCaja, setInputIdCaja] = useState('');
    const [inputStatusFilter, setInputStatusFilter] = useState('todos'); // 'todos', 'abierta', 'cerrada'

    const [activeFilters, setActiveFilters] = useState({
        desde: getYesterday(),
        hasta: getToday(),
        sortOrder: 'desc',
        idCaja: '',
        status: 'todos'
    });

    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) {
            setLoadingStatus(true);
            setLoadingHistorial(true);
        }
        try {
            const resEstado = await apiClient.get('/caja/estado/');
            const resHistorial = await apiClient.get('/caja/historial/');
            
            if (resEstado.data && resEstado.data.id && resEstado.data.caja_estado === true) {
                setCajaAbierta(resEstado.data);
                setIsPrimeraCaja(false);
            } else {
                setCajaAbierta(null);
                const monto = resEstado.data.monto_sugerido_apertura || 0;
                setMontoSugeridoApertura(monto);
                setIsPrimeraCaja(monto === 0 && resEstado.data.caja_estado === false);
            }
            
            // Orden inicial de API
            setCajasHistorial(resHistorial.data);
        } catch (err) {
            console.error("Error cargando datos de caja:", err);
            Swal.fire('Error', 'No se pudo conectar con el servidor de caja.', 'error');
        } finally {
            setLoadingStatus(false);
            setLoadingHistorial(false);
        }
    }, []);

    useEffect(() => {
        fetchData(true);
        const intervalId = setInterval(() => fetchData(false), 15000);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    // --- Lógica de Filtrado y Ordenamiento ---
    const filteredCajas = useMemo(() => {
        const { desde, hasta, sortOrder, idCaja, status } = activeFilters;
        const termIdCaja = idCaja.trim();
        
        let result = cajasHistorial.filter(caja => {
            const fechaApertura = new Date(caja.caja_fecha_hora_apertura);

            if (termIdCaja && !String(caja.id).startsWith(termIdCaja)) return false;

            if (status === 'abierta' && !caja.caja_estado) return false;
            if (status === 'cerrada' && caja.caja_estado) return false;

            if (desde) {
                try {
                    const fechaDesde = new Date(desde + 'T00:00:00');
                    if (fechaApertura < fechaDesde) return false;
                } catch (e) { console.warn("Fecha 'desde' inválida"); }
            }
            if (hasta) {
                try {
                    const fechaHasta = new Date(hasta + 'T23:59:59');
                    if (fechaApertura > fechaHasta) return false;
                } catch (e) { console.warn("Fecha 'hasta' inválida"); }
            }
            return true;
        });

        result.sort((a, b) => {
            const dateA = new Date(a.caja_fecha_hora_apertura);
            const dateB = new Date(b.caja_fecha_hora_apertura);
            if (sortOrder === 'asc') {
                return dateA - dateB; 
            } else {
                return dateB - dateA; 
            }
        });

        return result;
    }, [cajasHistorial, activeFilters]);

    // --- Handlers de Filtro ---
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setInputDateRange(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSortOrderChange = (e) => setInputSortOrder(e.target.value);
    const handleIdCajaChange = (e) => setInputIdCaja(e.target.value);
    const handleStatusChange = (status) => setInputStatusFilter(status);

    const handleAplicarFiltros = () => {
        setActiveFilters({
            desde: inputDateRange.desde,
            hasta: inputDateRange.hasta,
            sortOrder: inputSortOrder,
            idCaja: inputIdCaja,
            status: inputStatusFilter
        });
    };

    const handleLimpiarFiltros = () => {
        setInputDateRange({ desde: getYesterday(), hasta: getToday() });
        setInputSortOrder('desc');
        setInputIdCaja('');
        setInputStatusFilter('todos');
        
        setActiveFilters({
            desde: getYesterday(),
            hasta: getToday(),
            sortOrder: 'desc',
            idCaja: '',
            status: 'todos'
        });
    };

    // --- Handlers de Caja ---
    const handleCajaAbierta = async () => {
        setLoadingStatus(true);
        setLoadingHistorial(true);
        await fetchData(true); 
    };

    const handleCerrarCaja = async () => {
        Swal.fire({
            title: 'Verificando estado...',
            text: 'Consultando la base de datos...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        try {
            const resEstado = await apiClient.get('/caja/estado/');
            if (!resEstado.data || !resEstado.data.id || resEstado.data.caja_estado !== true) {
                Swal.fire('Error', 'La caja ya ha sido cerrada. Refrescando...', 'error');
                fetchData(true);
                return;
            }
            setCajaParaCerrar(resEstado.data);
            setIsCerrarModalOpen(true);
            Swal.close();
        } catch (err) {
            console.error("Error al verificar estado antes de cerrar:", err);
            Swal.fire('Error', 'No se pudo verificar el estado de la caja. Intente de nuevo.', 'error');
        }
    };

    const handleConfirmarCierre = async (observacion) => {
        try {
            const response = await apiClient.patch('/caja/cerrar/', { caja_observacion: observacion || "" });
            const { caja_saldo_final } = response.data;
            setIsCerrarModalOpen(false);
            setCajaParaCerrar(null);
            await Swal.fire('Caja Cerrada', `Saldo Final (Efectivo): $${formatCurrency(caja_saldo_final)}`, 'success');
            fetchData(true);
        } catch (err) {
            const errorMsg = err.response?.data?.detail || "No se pudo cerrar la caja.";
            Swal.fire('Error', errorMsg, 'error');
            if (err.response?.status === 400) {
                fetchData(true);
                setIsCerrarModalOpen(false);
                setCajaParaCerrar(null);
            }
        }
    };

    const handleViewDetalle = (caja) => setDetalleModalCaja(caja);

    if (loadingStatus || loadingHistorial) return <div className={styles.loading}>Cargando Cajas...</div>;

    return (
        <div className={styles.cajaContainer}>
            <div className={styles.historialContainer}>
                
                {/* --- BARRA DE FILTROS (CORREGIDA) --- */}
                <div className={styles.filtrosContainer}>
                    {/* Filtro ID Caja */}
                    <div className={styles.filtroGrupo}>
                        <label htmlFor="idCajaSearch">ID Caja:</label>
                        <input 
                            type="number" 
                            id="idCajaSearch"
                            placeholder="N°..."
                            value={inputIdCaja}
                            onChange={handleIdCajaChange}
                            className={styles.filtroInput}
                        />
                    </div>

                    {/* Filtro Estado */}
                    <div className={styles.filtroGrupo}>
                         <label>Estado:</label>
                         <div className={styles.botonesFiltroEstado}>
                            {ESTADOS_CAJA.map(estado => (
                                <button 
                                    key={estado.value}
                                    onClick={() => handleStatusChange(estado.value)}
                                    className={`${styles.botonFiltro} ${inputStatusFilter === estado.value ? styles.activo : ''}`}
                                >
                                    {estado.label}
                                </button>
                            ))}
                         </div>
                    </div>

                    {/* Filtro Fechas */}
                    <div className={styles.filtroGrupo}>
                        <label>Fecha:</label>
                        <div className={styles.inputsFecha}>
                            <label htmlFor="desde">Desde:</label>
                            <input 
                                type="date" 
                                name="desde" 
                                id="desde"
                                value={inputDateRange.desde} 
                                onChange={handleDateChange} 
                                className={styles.inputFecha} 
                            />
                            <label htmlFor="hasta">Hasta:</label>
                            <input 
                                type="date" 
                                name="hasta" 
                                id="hasta"
                                value={inputDateRange.hasta} 
                                onChange={handleDateChange} 
                                className={styles.inputFecha} 
                            />
                        </div>
                    </div>

                    {/* Filtro Orden */}
                    <div className={styles.filtroGrupo}>
                        <label htmlFor="sortOrder">Orden:</label>
                        <select 
                            id="sortOrder"
                            value={inputSortOrder} 
                            onChange={handleSortOrderChange} 
                            className={styles.filtroInput} 
                        >
                            <option value="desc">Más Reciente</option>
                            <option value="asc">Más Antiguo</option>
                        </select>
                    </div>
                    
                    <div className={styles.filtroAcciones}>
                        <button className={styles.botonLimpiar} onClick={handleLimpiarFiltros}>Limpiar</button>
                        <button className={styles.botonAplicar} onClick={handleAplicarFiltros}>Aplicar Filtros</button>
                    </div>
                </div>
                {/* ------------------------------ */}

                <div className={styles.toolbar}>
                    {!cajaAbierta && (
                        <AbrirCajaForm
                            onCajaAbierta={handleCajaAbierta}
                            montoSugerido={montoSugeridoApertura}
                            esPrimeraCaja={isPrimeraCaja}
                        />
                    )}
                    {cajaAbierta && (
                        <span className={styles.cajaAbiertaInfo}>
                            Hay una caja abierta (N°{cajaAbierta.id}).
                        </span>
                    )}
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Número de Caja</th>
                            <th>Fecha y Hora de Apertura</th>
                            <th>Fecha y Hora de Cierre</th>
                            <th>Estado</th>
                            <th>Monto Inicial</th>
                            <th>Saldo Final (Efectivo)</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCajas.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center' }}>No hay historial de cajas que coincida.</td>
                            </tr>
                        ) : (
                            filteredCajas.map(caja => (
                                <tr key={caja.id} className={caja.caja_estado ? styles.filaAbierta : styles.filaCerrada}>
                                    <td>Caja N°{caja.id}</td>
                                    <td>{new Date(caja.caja_fecha_hora_apertura).toLocaleString()}</td>
                                    <td>{caja.caja_fecha_hora_cierre ? new Date(caja.caja_fecha_hora_cierre).toLocaleString() : '-'}</td>
                                    <td>
                                        <span className={`${styles.estadoBadge} ${caja.caja_estado ? styles.estadoAbierta : styles.estadoCerrada}`}>
                                            {caja.caja_estado ? 'Abierta' : 'Cerrada'}
                                        </span>
                                    </td>
                                    <td>${formatCurrency(caja.caja_monto_inicial)}</td>
                                    <td>{caja.caja_saldo_final != null ? `$${formatCurrency(caja.caja_saldo_final)}` : '-'}</td>
                                    <td className={styles.actions}>
                                        {caja.caja_estado ? (
                                            <>
                                                <button className={styles.viewButton} onClick={() => handleViewDetalle(caja)}>
                                                    Ver Detalles
                                                </button>
                                                <button
                                                    className={styles.cerrarButtonSmall}
                                                    onClick={handleCerrarCaja}
                                                >
                                                    Cerrar Caja
                                                </button>
                                            </>
                                        ) : (
                                            <button className={styles.viewButton} onClick={() => handleViewDetalle(caja)}>
                                                Ver Detalles
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {detalleModalCaja && (
                <CajaDetalleModal
                    cajaInicial={detalleModalCaja}
                    onClose={() => setDetalleModalCaja(null)}
                    onCerrarCajaClick={handleCerrarCaja}
                    onHistorialRefresh={() => fetchData(false)}
                />
            )}

            {isCerrarModalOpen && cajaParaCerrar && (
                <CerrarCajaModal
                    caja={cajaParaCerrar}
                    onClose={() => {
                        setIsCerrarModalOpen(false);
                        setCajaParaCerrar(null);
                    }}
                    onConfirm={handleConfirmarCierre}
                />
            )}
        </div>
    );
};

export default CajasPage;