import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import styles from './InicioPage.module.css';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    AlertTriangle, Loader2, ServerOff, PieChart as PieIcon,
    CalendarDays, ShoppingBag, Bot, FileDown, X
} from 'lucide-react';

// Importamos el servicio de IA y jsPDF
import { generateDashboardReport } from '../../services/geminiService';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';

// Colores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A50000', '#8884d8', '#FF6384', '#36A2EB'];

// --- Componente Tarjeta ---
const DashboardCard = ({ title, icon, children, className }) => (
    <div className={`${styles.card} ${className || ''}`}>
        <div className={styles.cardHeader}>
            {icon}
            <h2 className={styles.cardTitle}>{title}</h2>
        </div>
        <div className={styles.cardContent}>
            {children}
        </div>
    </div>
);

// --- MODAL REPORTE IA ---
const ReporteIAModal = ({ isOpen, onClose, reportText, onDownload }) => {
    if (!isOpen) return null;
    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3><Bot size={24} style={{ marginRight: '10px', color: '#A50000' }} />Reporte Estratégico IA</h3>
                    <button onClick={onClose} className={styles.closeButton}><X size={24} /></button>
                </div>
                <div className={styles.reportBody}>
                    <pre className={styles.reportText}>{reportText}</pre>
                </div>
                <div className={styles.modalActions}>
                    <button onClick={onDownload} className={styles.downloadButton}>
                        <FileDown size={18} style={{ marginRight: '8px' }} /> Descargar PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Dashboard Admin ---
const AdminDashboard = () => {
    const [insumosBajos, setInsumosBajos] = useState([]);
    const [allVentas, setAllVentas] = useState([]);

    // Estados para Gráficos
    const [dataTortaPago, setDataTortaPago] = useState([]);
    const [dataBarrasDias, setDataBarrasDias] = useState([]);
    const [dataTortaProductos, setDataTortaProductos] = useState([]); // Nuevo Gráfico

    // Estados para IA
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiReport, setAiReport] = useState("");
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const [fechas, setFechas] = useState({
        desde: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        hasta: today,
    });

    const [loadingInsumos, setLoadingInsumos] = useState(true);
    const [loadingVentas, setLoadingVentas] = useState(true);

    // 1. Carga de Datos
    useEffect(() => {
        const fetchInsumos = async () => {
            setLoadingInsumos(true);
            try {
                const response = await apiClient.get('/inventario/insumos/');
                // Filtrar stock bajo
                const bajos = response.data.filter(insumo => {
                    const actual = parseFloat(insumo.insumo_stock);
                    const minimo = parseFloat(insumo.insumo_stock_minimo);
                    return !isNaN(actual) && !isNaN(minimo) && actual <= minimo;
                });
                setInsumosBajos(bajos);
            } catch (error) {
                console.error("Error insumos:", error);
            } finally {
                setLoadingInsumos(false);
            }
        };

        const fetchVentas = async () => {
            setLoadingVentas(true);
            try {
                const response = await apiClient.get('/venta/ventas/');
                setAllVentas(response.data);
            } catch (error) {
                console.error("Error ventas:", error);
            } finally {
                setLoadingVentas(false);
            }
        };

        fetchInsumos();
        fetchVentas();
    }, []);

    // 2. Procesamiento de Datos (Gráficos)
    const handleGenerarGrafico = useCallback(() => {
        if (!fechas.desde || !fechas.hasta) return;
        const fechaDesde = new Date(fechas.desde + 'T00:00:00');
        const fechaHasta = new Date(fechas.hasta + 'T23:59:59');

        const ventasFiltradas = allVentas.filter(venta => {
            const fechaVenta = new Date(venta.venta_fecha_hora);
            return fechaVenta >= fechaDesde && fechaVenta <= fechaHasta;
        });

        // -- A. Medios de Pago --
        const mapMediosPago = {};
        // -- B. Ingresos por Día --
        const mapIngresosDia = {};
        // -- C. Productos Vendidos (Top 10) --
        const mapProductos = {};

        ventasFiltradas.forEach(venta => {
            const totalVenta = parseFloat(venta.venta_total) || 0;

            // A. Medios de Pago
            const medio = venta.venta_medio_pago || 'Otros';
            mapMediosPago[medio] = (mapMediosPago[medio] || 0) + totalVenta;

            // B. Ingresos por Día
            const fechaStr = new Date(venta.venta_fecha_hora).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            mapIngresosDia[fechaStr] = (mapIngresosDia[fechaStr] || 0) + totalVenta;

            // C. Productos (Iterar detalles)
            if (venta.pedido && venta.pedido.detalles) {
                venta.pedido.detalles.forEach(detalle => {
                    const nombreProd = detalle.producto_nombre || detalle.notas || 'Producto';
                    mapProductos[nombreProd] = (mapProductos[nombreProd] || 0) + (detalle.cantidad || 1);
                });
            }
        });

        // Setear Estados
        setDataTortaPago(Object.keys(mapMediosPago).map(key => ({ name: key, value: mapMediosPago[key] })));

        setDataBarrasDias(Object.keys(mapIngresosDia).map(key => ({ fecha: key, total: mapIngresosDia[key] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 7)); // Top 7 Días

        setDataTortaProductos(Object.keys(mapProductos).map(key => ({ name: key, value: mapProductos[key] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)); // Top 10 Productos

    }, [allVentas, fechas]);

    useEffect(() => {
        if (!loadingVentas && allVentas.length > 0) {
            handleGenerarGrafico();
        }
    }, [loadingVentas, allVentas, handleGenerarGrafico]);


    // 3. Lógica de IA y PDF
    const handleGenerateRecommendation = async () => {
        setIsGeneratingAI(true);
        try {
            const datosParaIA = {
                ventasTotales: allVentas.length,
                topProductos: dataTortaProductos.map(p => `${p.name} (${p.value}u)`),
                topDias: dataBarrasDias.map(d => `${d.fecha}: $${d.total}`),
                mediosPago: dataTortaPago.map(p => `${p.name}: $${p.value}`),
                stockBajo: insumosBajos.map(i => `${i.insumo_nombre} (Stock: ${i.insumo_stock})`),
            };

            const report = await generateDashboardReport(datosParaIA);
            setAiReport(report);
            setIsReportModalOpen(true);

        } catch (error) {
            Swal.fire('Error IA', 'No se pudo generar el reporte. Verifica tu conexión o API Key.', 'error');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- FUNCIÓN DE PDF CORREGIDA ---
    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // --- 1. CONFIGURACIÓN ---
        const margin = 15; // Margen (en mm)
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const usableWidth = pageWidth - (margin * 2);
        let y = 0; // Posición Y inicial

        // --- 2. TÍTULO Y FECHA ---
        doc.setFontSize(18);
        doc.setTextColor(165, 0, 0); // Rojo
        doc.text("Informe Estratégico - Santo Pecado", margin, 20);
        y = 30; // Mover Y hacia abajo

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, margin, y);
        y += 5; // Mover Y

        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y); // Línea separadora
        y += 10; // Espacio después de la línea

        // --- 3. CONTENIDO (CON PAGINACIÓN) ---

        // Usamos una fuente monoespaciada para que coincida con el <pre>
        doc.setFont('courier', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(0);

        // Dividir el texto en líneas que quepan en el ancho
        const splitText = doc.splitTextToSize(aiReport, usableWidth);

        // Altura aproximada de cada línea (en mm)
        const lineHeight = 6;

        // Loop por cada línea
        splitText.forEach(line => {
            // Revisar si la línea entra en la página actual
            if (y + lineHeight > pageHeight - margin) {
                doc.addPage(); // Añadir página nueva
                y = margin; // Resetear Y al margen superior
            }

            // Escribir la línea
            doc.text(line, margin, y);

            // Mover Y para la siguiente línea
            y += lineHeight;
        });

        // --- 4. GUARDAR ---
        doc.save(`Reporte_Estrategico_${today}.pdf`);
    };
    // --- FIN DE LA CORRECCIÓN ---


    // --- Renders Auxiliares ---
    const renderStockBajo = () => {
        if (loadingInsumos) return <p>Cargando...</p>;
        if (insumosBajos.length === 0) return <p className={styles.sinAlertas}>¡Stock saludable!</p>;
        return (
            <ul className={styles.lowStockList}>
                {insumosBajos.map(insumo => (
                    <li key={insumo.id} className={styles.lowStockItem}>
                        <span className={styles.itemName}>{insumo.insumo_nombre}</span>
                        <span className={styles.stockBajoValue}>{parseFloat(insumo.insumo_stock)} {insumo.insumo_unidad}</span>
                    </li>
                ))}
            </ul>
        );
    };

    const handleDateChange = (e) => {
        setFechas({ ...fechas, [e.target.name]: e.target.value });
    };

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.headerRow}>
                <h1 className={styles.welcomeMessage}>Dashboard de Resumen</h1>

                {/* <button
                    className={styles.aiButton}
                    onClick={handleGenerateRecommendation}
                    disabled={isGeneratingAI}
                >
                    {isGeneratingAI ? (
                        <><Loader2 className={styles.spin} size={20} /> Analizando...</>
                    ) : (
                        <><Bot size={20} /> Generar Recomendación con IA</>
                    )}
                </button> */}
            </div>

            {/* Filtros */}
            <div className={styles.filterCard}>
                <div className={styles.chartFilterBar}>
                    <div className={styles.formGroup}>
                        <label>Desde:</label>
                        <input type="date" name="desde" value={fechas.desde} onChange={handleDateChange} className={styles.dateInput} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Hasta:</label>
                        <input type="date" name="hasta" value={fechas.hasta} max={today} onChange={handleDateChange} className={styles.dateInput} />
                    </div>
                    <button className={styles.generarButton} onClick={handleGenerarGrafico}>Actualizar</button>
                </div>
            </div>

            {/* GRID DE TARJETAS */}
            <div className={styles.dashboardGrid}>

                {/* 1. Torta Productos (Top 10) */}
                <DashboardCard title="Top 10 Productos Más Vendidos" icon={<ShoppingBag size={24} />}>
                    {dataTortaProductos.length === 0 ? <p className={styles.sinAlertas}>Sin datos.</p> : (
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={dataTortaProductos}
                                        cx="50%" cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {dataTortaProductos.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [value, name]} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </DashboardCard>

                {/* 2. Torta Ingresos */}
                <DashboardCard title="Ingresos por Medio de Pago" icon={<PieIcon size={24} />}>
                    {dataTortaPago.length === 0 ? <p className={styles.sinAlertas}>Sin datos.</p> : (
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={dataTortaPago}
                                        cx="50%" cy="50%"
                                        innerRadius={40}
                                        outerRadius={80}
                                        fill="#82ca9d"
                                        dataKey="value"
                                    >
                                        {dataTortaPago.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `$${new Intl.NumberFormat('es-AR').format(value)}`} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </DashboardCard>

                {/* 3. Barras Dias */}
                <DashboardCard title="Días con Mayores Ingresos" icon={<CalendarDays size={24} />}>
                    {dataBarrasDias.length === 0 ? <p className={styles.sinAlertas}>Sin datos.</p> : (
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer>
                                <BarChart data={dataBarrasDias} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="fecha" style={{ fontSize: '10px' }} />
                                    <YAxis style={{ fontSize: '10px' }} />
                                    <Tooltip formatter={(value) => [`$${new Intl.NumberFormat('es-AR').format(value)}`, 'Ventas']} />
                                    <Bar dataKey="total" fill="#A50000" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </DashboardCard>

                {/* 4. Stock */}
                <DashboardCard title="Alertas de Stock" icon={<AlertTriangle size={24} />}>
                    {renderStockBajo()}
                </DashboardCard>

            </div>

            {/* MODAL DE REPORTE */}
            <ReporteIAModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                reportText={aiReport}
                onDownload={handleDownloadPDF}
            />
        </div>
    );
};

// --- Componente Router (Sin cambios) ---
const InicioPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const userRol = user.rol;
        if (userRol === 'Admin' || userRol === 'Encargado/Cajero') setIsLoading(false);
        else if (userRol === 'Cliente') {
            navigate(localStorage.getItem('bienvenidaVista') ? '/carta' : '/bienvenido', { replace: true });
        }
        else if (userRol === 'Cocina') navigate('/cocina', { replace: true });
        else setIsLoading(false);
    }, [user, navigate]);

    if (isLoading) return <div className={styles.dashboardContainer}><Loader2 className={styles.spin} /></div>;
    if (user && (user.rol === 'Admin' || user.rol === 'Encargado/Cajero')) return <AdminDashboard />;
    if (user && !user.rol) return <CuentaPendiente />;
    return null;
};

const CuentaPendiente = () => (
    <div className={styles.dashboardContainer}>
        <div className={styles.card} style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '2rem' }}>
            <ServerOff size={48} style={{ margin: '0 auto', color: '#f0ad4e' }} />
            <h2>Cuenta sin rol asignado</h2>
            <p>Contacta al administrador.</p>
        </div>
    </div>
);

export default InicioPage;