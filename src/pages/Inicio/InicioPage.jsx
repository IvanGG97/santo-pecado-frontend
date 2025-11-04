import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/api';
import styles from './InicioPage.module.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, BarChartHorizontalBig } from 'lucide-react'; // Iconos

// --- Componente de Tarjeta Reutilizable ---
const DashboardCard = ({ title, icon, children }) => (
    <div className={styles.card}>
        <div className={styles.cardHeader}>
            {icon}
            <h2 className={styles.cardTitle}>{title}</h2>
        </div>
        <div className={styles.cardContent}>
            {children}
        </div>
    </div>
);

// --- Componente Principal de la Página ---
const InicioPage = () => {
    const [insumosBajos, setInsumosBajos] = useState([]);
    const [allVentas, setAllVentas] = useState([]);
    const [chartData, setChartData] = useState([]);
    
    // Estados para los filtros de fecha
    const [fechas, setFechas] = useState({
        desde: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Por defecto: últimos 30 días
        hasta: new Date().toISOString().split('T')[0], // Por defecto: hoy
    });

    const [loadingInsumos, setLoadingInsumos] = useState(true);
    const [loadingVentas, setLoadingVentas] = useState(true);

    // --- Carga de Datos Inicial ---
    useEffect(() => {
        // 1. Cargar Insumos con stock bajo
        const fetchInsumos = async () => {
            setLoadingInsumos(true);
            try {
                const response = await apiClient.get('/inventario/insumos/');
                const insumos = response.data;
                
                // --- CORRECCIÓN 1: Usar los nombres de campo correctos ---
                const bajos = insumos.filter(insumo => {
                    // Usa 'insumo_stock' (no 'insumo_stock_actual')
                    const actual = parseFloat(insumo.insumo_stock); 
                    const minimo = parseFloat(insumo.insumo_stock_minimo);

                    if (!isNaN(actual) && !isNaN(minimo)) {
                        return actual <= minimo;
                    }
                    return false; 
                });
                // --- FIN DE CORRECCIÓN 1 ---
                
                setInsumosBajos(bajos);
            } catch (error) {
                console.error("Error cargando insumos:", error);
            } finally {
                setLoadingInsumos(false);
            }
        };

        // 2. Cargar TODAS las ventas
        const fetchVentas = async () => {
            setLoadingVentas(true);
            try {
                const response = await apiClient.get('/venta/ventas/');
                setAllVentas(response.data);
            } catch (error) {
                console.error("Error cargando ventas:", error);
            } finally {
                setLoadingVentas(false);
            }
        };

        fetchInsumos();
        fetchVentas();
    }, []);

    // --- Lógica del Gráfico ---
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setFechas(prev => ({ ...prev, [name]: value }));
    };

    // Procesamiento de datos para el gráfico
    const handleGenerarGrafico = useCallback(() => {
        if (!fechas.desde || !fechas.hasta) {
            alert("Por favor, seleccione un rango de fechas.");
            return;
        }

        const fechaDesde = new Date(fechas.desde + 'T00:00:00');
        const fechaHasta = new Date(fechas.hasta + 'T23:59:59');

        const ventasFiltradas = allVentas.filter(venta => {
            if (venta.estado_venta?.estado_venta_nombre !== 'Pagado') {
                return false;
            }
            const fechaVenta = new Date(venta.venta_fecha_hora);
            return fechaVenta >= fechaDesde && fechaVenta <= fechaHasta;
        });

        const productosVendidos = new Map();
        
        for (const venta of ventasFiltradas) {
            if (venta.pedido && venta.pedido.detalles) {
                for (const detalle of venta.pedido.detalles) {

                    // --- CORRECCIÓN 2: Excluir "agregados" ---
                    // Ahora 'detalle.producto_tipo' SÍ existe gracias al cambio en el serializer
                    if (detalle.producto_tipo && detalle.producto_tipo.toLowerCase() === 'agregados') {
                        continue; // Salta este 'detalle' y no lo cuenta
                    }
                    // --- FIN DE CORRECCIÓN 2 ---

                    const nombreProducto = detalle.producto_nombre || detalle.notas || 'Producto Desconocido';
                    const cantidad = detalle.cantidad || 0; 

                    const cantidadActual = productosVendidos.get(nombreProducto) || 0;
                    productosVendidos.set(nombreProducto, cantidadActual + cantidad);
                }
            }
        }

        const datosGrafico = Array.from(productosVendidos, ([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total) 
            .slice(0, 10); 

        setChartData(datosGrafico);

    }, [allVentas, fechas]);

    // Generar el gráfico la primera vez que se cargan las ventas
    useEffect(() => {
        if (!loadingVentas && allVentas.length > 0) {
            handleGenerarGrafico();
        }
    }, [loadingVentas, allVentas, handleGenerarGrafico]);


    // --- Componentes de Renderizado ---

    const renderStockBajo = () => {
        if (loadingInsumos) {
            return <p>Cargando...</p>;
        }
        if (insumosBajos.length === 0) {
            return <p className={styles.sinAlertas}>¡Todo bien! No hay insumos con stock crítico.</p>;
        }
        return (
            <ul className={styles.lowStockList}>
                {insumosBajos.map(insumo => (
                    <li key={insumo.id} className={styles.lowStockItem}>
                        <span className={styles.itemName}>{insumo.insumo_nombre}</span>
                        <span className={styles.itemStock}>
                            {/* --- CORRECCIÓN 1 (Renderizado) --- */}
                            <strong>{parseFloat(insumo.insumo_stock) || 0}</strong> / {parseFloat(insumo.insumo_stock_minimo) || 0} {insumo.insumo_unidad}
                        </span>
                    </li>
                ))}
            </ul>
        );
    };

    const renderGraficoVentas = () => {
        if (loadingVentas) {
            return <p>Cargando datos de ventas...</p>;
        }
        if (chartData.length === 0) {
            return <p className={styles.sinAlertas}>No se encontraron ventas para este rango de fechas.</p>;
        }

        return (
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        layout="vertical" 
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={150} 
                            tick={{ fontSize: 12 }} 
                            interval={0} 
                        />
                        <Tooltip 
                            formatter={(value) => [value, 'Unidades']}
                        />
                        <Legend />
                        <Bar dataKey="total" name="Unidades Vendidas" fill="#A50000" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className={styles.dashboardContainer}>
            <h1 className={styles.welcomeMessage}>Dashboard de Resumen</h1>

            <div className={styles.dashboardGrid}>
                {/* Columna Izquierda: Gráfico de Ventas */}
                <DashboardCard 
                    title="Productos Más Vendidos (Top 10)"
                    icon={<BarChartHorizontalBig size={24} />}
                >
                    <div className={styles.chartFilterBar}>
                        <div className={styles.formGroup}>
                            <label htmlFor="desde">Desde:</label>
                            <input 
                                type="date" 
                                id="desde"
                                name="desde"
                                value={fechas.desde}
                                onChange={handleDateChange}
                                className={styles.dateInput}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="hasta">Hasta:</label>
                            <input 
                                type="date" 
                                id="hasta"
                                name="hasta"
                                value={fechas.hasta}
                                onChange={handleDateChange}
                                className={styles.dateInput}
                            />
                        </div>
                        <button className={styles.generarButton} onClick={handleGenerarGrafico}>
                            Generar Gráfico
                        </button>
                    </div>
                    {renderGraficoVentas()}
                </DashboardCard>

                {/* Columna Derecha: Stock Crítico */}
                <DashboardCard 
                    title="Insumos con Stock Crítico"
                    icon={<AlertTriangle size={24} />}
                >
                    {renderStockBajo()}
                </DashboardCard>
            </div>
        </div>
    );
};

export default InicioPage;

