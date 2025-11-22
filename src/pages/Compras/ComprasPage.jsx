import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import styles from './ComprasPage.module.css';
import Swal from 'sweetalert2';
import AddCompraModal from '../../components/AddCompraModal/AddCompraModal';

// --- Helpers de Fecha ---
const getToday = () => new Date().toISOString().split('T')[0];
const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

const METODOS_PAGO_FILTRO = [
    { value: 'todos', label: 'Todos' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia Bancaria' }
];

const CompraDetalleModal = ({ compra, onClose }) => {
    const formatCurrency = (value) => new Intl.NumberFormat('es-AR').format(value || 0);

    return (
        <div className={styles.modalBackdrop}>
            <div className={`${styles.modalContent} ${styles.modalDetalleLg || ''}`}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>Detalle de Compra #{compra.id}</h2>
                <div className={styles.modalSection}>
                    <h4>Información General</h4>
                    <div className={styles.gestionGridInfo}>
                        <div className={styles.gridItemFull}><strong>Proveedor:</strong> {compra.proveedor || 'N/A'}</div>
                        <div className={styles.gridItemFull}><strong>Empleado:</strong> {compra.empleado ? `${compra.empleado.first_name} ${compra.empleado.last_name}`.trim() : 'N/A'}</div>
                        <div className={styles.gridItem}><strong>Método de Pago:</strong> {compra.compra_metodo_pago}</div>
                        <div className={styles.gridItem}><strong>Caja ID:</strong> {compra.caja || 'N/A'}</div>
                        <div className={styles.gridItemFull}><strong>Fecha:</strong> {new Date(compra.compra_fecha_hora).toLocaleString()}</div>
                    </div>
                </div>
                <div className={styles.modalSection}>
                    <h4>Insumos Comprados</h4>
                    <div className={styles.detalleVentaList}>
                        {compra.detalles && compra.detalles.length > 0 ? (
                            compra.detalles.map((detalle) => (
                                <div key={detalle.id} className={styles.detalleVentaItem}>
                                    <span className={styles.detalleQty}>{parseFloat(detalle.detalle_compra_cantidad) || 0}x</span>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.detalleNombre}>{detalle.insumo_nombre} ({detalle.insumo_unidad})</span>
                                    </div>
                                    <span className={styles.detallePrecio}>
                                        ${formatCurrency(detalle.detalle_compra_precio_unitario)} c/u (base)
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p>No se encontraron detalles para esta compra.</p>
                        )}
                    </div>
                    <div className={styles.detalleTotal}>
                        <strong>Total Compra:</strong>
                        <strong>${formatCurrency(compra.compra_total)}</strong>
                    </div>
                </div>
                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.cancelButton}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};


const ComprasPage = () => {
    const [allCompras, setAllCompras] = useState([]); 
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false); 
    const [selectedCompraDetalle, setSelectedCompraDetalle] = useState(null); 
    const [isVerifyingCaja, setIsVerifyingCaja] = useState(true);
    const navigate = useNavigate();

    const [inputIdCompra, setInputIdCompra] = useState('');
    // --- 1. Fechas por defecto ---
    const [inputDateRange, setInputDateRange] = useState({ desde: getYesterday(), hasta: getToday() });
    const [inputProveedor, setInputProveedor] = useState('');
    const [inputEmpleado, setInputEmpleado] = useState('');
    const [inputMetodoPago, setInputMetodoPago] = useState('todos');
    // --- 2. Orden por defecto ---
    const [inputSortOrder, setInputSortOrder] = useState('desc');

    const [activeFilters, setActiveFilters] = useState({
        idCompra: '',
        desde: getYesterday(),
        hasta: getToday(),
        proveedor: '',
        empleado: '',
        metodoPago: 'todos',
        sortOrder: 'desc'
    });

    const fetchCompras = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const response = await apiClient.get('/compra/compras/');
            // Orden inicial API
            setAllCompras(response.data.sort((a, b) => new Date(b.compra_fecha_hora) - new Date(a.compra_fecha_hora)));
            setError(null);
        } catch (error) {
            console.error("Error al cargar compras:", error);
            setError("No se pudieron cargar las compras.");
            Swal.fire('Error', 'No se pudieron cargar las compras.', 'error');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const checkCajaStatus = async () => {
            try {
                const res = await apiClient.get('/caja/estado/');
                if (res.data && res.data.caja_estado === true) {
                    setIsVerifyingCaja(false); 
                } else {
                    Swal.fire({
                        title: 'Caja Cerrada',
                        text: 'Para entrar a esta seccion primero debes abrir una caja',
                        icon: 'warning',
                        confirmButtonText: 'Ir a Cajas',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                    }).then((result) => {
                        if (result.isConfirmed) navigate('/cajas'); 
                    });
                }
            } catch (err) {
                console.error("Error al verificar estado de caja:", err);
                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo verificar el estado de la caja. Intente más tarde.',
                    icon: 'error',
                    confirmButtonText: 'Ir a Inicio',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                }).then(() => navigate('/inicio'));
            }
        };
        checkCajaStatus();
    }, [navigate]);

    useEffect(() => {
        if (!isVerifyingCaja) fetchCompras(true);
    }, [fetchCompras, isVerifyingCaja]); 

    const filteredCompras = useMemo(() => {
        const { idCompra, proveedor, empleado, metodoPago, desde, hasta, sortOrder } = activeFilters;
        const termIdCompra = idCompra.trim();
        const termProveedor = proveedor.toLowerCase().trim();
        const termEmpleado = empleado.toLowerCase().trim();

        let result = allCompras.filter(compra => {
            if (termIdCompra && !String(compra.id).startsWith(termIdCompra)) return false;
            if (termProveedor && !(compra.proveedor || '').toLowerCase().includes(termProveedor)) return false;
            
            if (termEmpleado) {
                const nombreCompleto = `${compra.empleado?.first_name || ''} ${compra.empleado?.last_name || ''}`.toLowerCase().trim();
                if (!nombreCompleto.includes(termEmpleado)) return false;
            }
            
            if (metodoPago !== 'todos' && compra.compra_metodo_pago !== metodoPago) return false;
            
            if (desde) {
                try {
                    const fechaDesde = new Date(desde + 'T00:00:00');
                    const fechaCompra = new Date(compra.compra_fecha_hora);
                    if (fechaCompra < fechaDesde) return false;
                } catch (e) { console.warn("Fecha 'desde' inválida"); }
            }
            
            if (hasta) {
                try {
                    const fechaHasta = new Date(hasta + 'T23:59:59');
                    const fechaCompra = new Date(compra.compra_fecha_hora);
                    if (fechaCompra > fechaHasta) return false;
                } catch (e) { console.warn("Fecha 'hasta' inválida"); }
            }
            return true;
        });

        // --- Ordenamiento ---
        result.sort((a, b) => {
            const dateA = new Date(a.compra_fecha_hora);
            const dateB = new Date(b.compra_fecha_hora);
            if (sortOrder === 'asc') {
                return dateA - dateB; // Más antiguo primero
            } else {
                return dateB - dateA; // Más reciente primero
            }
        });

        return result;
    }, [allCompras, activeFilters]);
    
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setInputDateRange(prevRange => ({ ...prevRange, [name]: value }));
    };

    const handleSortOrderChange = (e) => {
        setInputSortOrder(e.target.value);
    };

    const handleAplicarFiltros = () => {
        setActiveFilters({
            idCompra: inputIdCompra,
            desde: inputDateRange.desde,
            hasta: inputDateRange.hasta,
            proveedor: inputProveedor,
            empleado: inputEmpleado,
            metodoPago: inputMetodoPago,
            sortOrder: inputSortOrder
        });
    };

    const handleLimpiarFiltros = () => {
        setInputIdCompra('');
        // Reset Fecha y Orden
        setInputDateRange({ desde: getYesterday(), hasta: getToday() });
        setInputProveedor('');
        setInputEmpleado('');
        setInputMetodoPago('todos');
        setInputSortOrder('desc');
        
        setActiveFilters({
            idCompra: '',
            desde: getYesterday(),
            hasta: getToday(),
            proveedor: '',
            empleado: '',
            metodoPago: 'todos',
            sortOrder: 'desc'
        });
    };
    
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);
    const handleCompraSuccess = () => { handleCloseModal(); fetchCompras(false); };
    const handleViewDetalle = (compra) => setSelectedCompraDetalle(compra);
    const handleCloseDetalleModal = () => setSelectedCompraDetalle(null);

    if (isVerifyingCaja) {
        return <div className={styles.comprasContainer} style={{ padding: '2rem', textAlign: 'center' }}>Verificando estado de la caja...</div>;
    }

    return (
        <div className={styles.comprasContainer}>
            <h1>Registro de Compras</h1>

            <div className={styles.filtrosContainer}>
                <div className={styles.filtroGrupo}>
                    <label htmlFor="idCompraSearch">ID Compra:</label>
                    <input type="number" id="idCompraSearch" placeholder="Buscar por ID..." value={inputIdCompra} onChange={(e) => setInputIdCompra(e.target.value)} className={styles.filtroInput} />
                </div>
                <div className={styles.filtroGrupo}>
                    <label htmlFor="proveedorSearch">Proveedor:</label>
                    <input type="text" id="proveedorSearch" placeholder="Nombre Proveedor..." value={inputProveedor} onChange={(e) => setInputProveedor(e.target.value)} className={styles.filtroInput} />
                </div>
                <div className={styles.filtroGrupo}>
                    <label htmlFor="empleadoSearch">Empleado:</label>
                    <input type="text" id="empleadoSearch" placeholder="Nombre Empleado..." value={inputEmpleado} onChange={(e) => setInputEmpleado(e.target.value)} className={styles.filtroInput} />
                </div>
                <div className={styles.filtroGrupo}>
                    <label>Método de Pago:</label>
                    <div className={styles.botonesFiltroEstado}>
                        {METODOS_PAGO_FILTRO.map(metodo => (
                            <button key={metodo.value} type="button" className={`${styles.botonFiltro} ${inputMetodoPago === metodo.value ? styles.activo : ''}`} onClick={() => setInputMetodoPago(metodo.value)}>
                                {metodo.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={styles.filtroGrupo}>
                    <label>Fecha:</label>
                    <div className={styles.inputsFecha}>
                        <label htmlFor="desde">Desde:</label>
                        <input type="date" id="desde" name="desde" value={inputDateRange.desde} onChange={handleDateChange} className={styles.inputFecha} />
                        <label htmlFor="hasta">Hasta:</label>
                        <input type="date" id="hasta" name="hasta" value={inputDateRange.hasta} onChange={handleDateChange} className={styles.inputFecha} />
                    </div>
                </div>

                {/* Filtro Orden */}
                <div className={styles.filtroGrupo}>
                    <label>Orden:</label>
                    <select value={inputSortOrder} onChange={handleSortOrderChange} className={styles.filtroInput}>
                        <option value="desc">Más Reciente a Más Antiguo</option>
                        <option value="asc">Más Antiguo a Más Reciente</option>
                    </select>
                </div>

                <div className={styles.filtroAcciones}>
                    <button className={styles.botonLimpiar} onClick={handleLimpiarFiltros}>Limpiar</button>
                    <button className={styles.botonAplicar} onClick={handleAplicarFiltros}>Aplicar Filtros</button>
                </div>
            </div>
            
            <div className={styles.toolbar}>
                <button className={styles.addButton} onClick={handleOpenModal}>Registrar Nueva Compra</button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? <p>Cargando historial de compras...</p> : error ? <p className={styles.errorText}>{error}</p> : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID Compra</th>
                                <th>Fecha y Hora</th>
                                <th>Proveedor</th>
                                <th>Empleado</th>
                                <th>Total</th>
                                <th>Método de Pago</th>
                                <th>Acciones</th> 
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCompras.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center' }}>No se encontraron compras con esos filtros.</td></tr>
                            ) : (
                                filteredCompras.map(compra => (
                                    <tr key={compra.id}>
                                        <td>{compra.id}</td>
                                        <td>{new Date(compra.compra_fecha_hora).toLocaleString()}</td>
                                        <td>{compra.proveedor || 'N/A'}</td>
                                        <td>{compra.empleado ? `${compra.empleado.first_name} ${compra.empleado.last_name}`.trim() : 'N/A'}</td>
                                        <td>${new Intl.NumberFormat('es-AR').format(compra.compra_total)}</td>
                                        <td>{compra.compra_metodo_pago}</td>
                                        <td className={styles.actions}>
                                            <button className={styles.viewButton} onClick={() => handleViewDetalle(compra)}>Ver Detalles</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && <AddCompraModal onClose={handleCloseModal} onSuccess={handleCompraSuccess} />}
            {selectedCompraDetalle && <CompraDetalleModal compra={selectedCompraDetalle} onClose={handleCloseDetalleModal} />}
        </div>
    );
};

export default ComprasPage;