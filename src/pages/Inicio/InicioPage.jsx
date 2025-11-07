import React, { useEffect, useState, useCallback} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import styles from './InicioPage.module.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, BarChartHorizontalBig, Loader2, ServerOff } from 'lucide-react'; // Iconos

// --- Componente de Tarjeta (Sin cambios) ---
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

// --- Componente del Dashboard de Admin (El contenido anterior) ---
const AdminDashboard = () => {
    const [insumosBajos, setInsumosBajos] = useState([]);
    const [allVentas, setAllVentas] = useState([]);
    const [chartData, setChartData] = useState([]);
    
    const [fechas, setFechas] = useState({
        desde: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], 
        hasta: new Date().toISOString().split('T')[0], 
    });

    const [loadingInsumos, setLoadingInsumos] = useState(true);
    const [loadingVentas, setLoadingVentas] = useState(true);

    useEffect(() => {
        const fetchInsumos = async () => {
            setLoadingInsumos(true);
            try {
                const response = await apiClient.get('/inventario/insumos/');
                const insumos = response.data;
                const bajos = insumos.filter(insumo => {
                    const actual = parseFloat(insumo.insumo_stock); 
                    const minimo = parseFloat(insumo.insumo_stock_minimo);
                    if (!isNaN(actual) && !isNaN(minimo)) {
                        return actual <= minimo;
                    }
                    return false; 
                });
                setInsumosBajos(bajos);
            } catch (error) {
                console.error("Error cargando insumos:", error);
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
                console.error("Error cargando ventas:", error);
            } finally {
                setLoadingVentas(false);
            }
        };

        fetchInsumos();
        fetchVentas();
    }, []);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setFechas(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerarGrafico = useCallback(() => {
        if (!fechas.desde || !fechas.hasta) return;
        const fechaDesde = new Date(fechas.desde + 'T00:00:00');
        const fechaHasta = new Date(fechas.hasta + 'T23:59:59');

        const ventasFiltradas = allVentas.filter(venta => {
            if (venta.estado_venta?.estado_venta_nombre !== 'Pagado') return false;
            const fechaVenta = new Date(venta.venta_fecha_hora);
            return fechaVenta >= fechaDesde && fechaVenta <= fechaHasta;
        });

        const productosVendidos = new Map();
        for (const venta of ventasFiltradas) {
            if (venta.pedido && venta.pedido.detalles) {
                for (const detalle of venta.pedido.detalles) {
                    if (detalle.producto_tipo && detalle.producto_tipo.toLowerCase() === 'agregados') {
                        continue; 
                    }
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

    useEffect(() => {
        if (!loadingVentas && allVentas.length > 0) {
            handleGenerarGrafico();
        }
    }, [loadingVentas, allVentas, handleGenerarGrafico]);

    const renderStockBajo = () => {
        if (loadingInsumos) return <p>Cargando...</p>;
        if (insumosBajos.length === 0) {
            return <p className={styles.sinAlertas}>¡Todo bien! No hay insumos con stock crítico.</p>;
        }
        return (
            <ul className={styles.lowStockList}>
                {insumosBajos.map(insumo => (
                    <li key={insumo.id} className={styles.lowStockItem}>
                        <span className={styles.itemName}>{insumo.insumo_nombre}</span>
                        <div className={styles.itemStock}>
                            <div className={styles.stockBajo}>
                                Stock Actual:{parseFloat(insumo.insumo_stock) || 0}
                            </div>
                            <div>
                                Stock Minimo:{parseFloat(insumo.insumo_stock_minimo) || 0}
                            </div> 
                            <div>
                                Unidad:{insumo.insumo_unidad}
                            </div>  
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    const renderGraficoVentas = () => {
        if (loadingVentas) return <p>Cargando datos de ventas...</p>;
        if (chartData.length === 0) {
            return <p className={styles.sinAlertas}>No se encontraron ventas para este rango de fechas.</p>;
        }
        return (
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical" >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} interval={0} />
                        <Tooltip formatter={(value) => [value, 'Unidades']} />
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
                <DashboardCard title="Productos Más Vendidos (Top 10)" icon={<BarChartHorizontalBig size={24} />}>
                    <div className={styles.chartFilterBar}>
                        <div className={styles.formGroup}>
                            <label htmlFor="desde">Desde:</label>
                            <input type="date" id="desde" name="desde" value={fechas.desde} onChange={handleDateChange} className={styles.dateInput} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="hasta">Hasta:</label>
                            <input type="date" id="hasta" name="hasta" value={fechas.hasta} onChange={handleDateChange} className={styles.dateInput} />
                        </div>
                        <button className={styles.generarButton} onClick={handleGenerarGrafico}>
                            Generar Gráfico
                        </button>
                    </div>
                    {renderGraficoVentas()}
                </DashboardCard>
                <DashboardCard title="Insumos con Stock Crítico" icon={<AlertTriangle size={24} />}>
                    {renderStockBajo()}
                </DashboardCard>
            </div>
        </div>
    );
};

// --- Componente de "Cuenta Pendiente" ---
const CuentaPendiente = () => (
    <div className={styles.dashboardContainer}>
        <div className={styles.card} style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <div className={styles.cardHeader} style={{ backgroundColor: '#ffc107', color: '#333' }}>
                <ServerOff size={24} />
                <h2 className={styles.cardTitle}>Cuenta Pendiente de Rol</h2>
            </div>
            <div className={styles.cardContent}>
                <p style={{ textAlign: 'center', fontSize: '1.1rem', lineHeight: '1.6' }}>
                    Tu cuenta ha sido registrada y activada, pero aún no tiene un rol asignado.
                    <br /><br />
                    Por favor, contacta a un administrador para que te asigne los permisos correspondientes.
                </p>
            </div>
        </div>
    </div>
);

// --- Componente "Router" Principal ---
const InicioPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            // Espera a que el contexto de Auth cargue el usuario
            return;
        }

        const userRol = user.rol; // 'Admin', 'Cliente', 'Cocina', null, etc.
        console.log("InicioPage: Rol de usuario es:", userRol);

        if (userRol === 'Admin' || userRol === 'Encargado/Cajero') {
            // Se queda en esta página y muestra el Dashboard
            setIsLoading(false);
        } 
        else if (userRol === 'Cliente') {
            // Es cliente, comprobar si es su primer login
            const bienvenidaVista = localStorage.getItem('bienvenidaVista');
            if (!bienvenidaVista) {
                // Nunca ha visto la bienvenida, redirigir
                navigate('/bienvenido', { replace: true });
            } else {
                // Ya vio la bienvenida, redirigir a la carta
                navigate('/carta', { replace: true });
            }
        }
        else if (userRol === 'Cocina') {
            // Es cocina, redirigir a su página
            navigate('/cocina', { replace: true });
        }
        else {
            // No tiene rol (es 'null' o 'undefined')
            // Muestra la página de "Pendiente"
            setIsLoading(false);
        }

    }, [user, navigate]);

    // Renderizado final
    if (isLoading) {
        // Muestra un loader mientras se decide qué hacer
        return (
            <div className={styles.dashboardContainer} style={{ textAlign: 'center', paddingTop: '5rem' }}>
                <Loader2 size={48} className={styles.spinner} />
                <p>Cargando...</p>
            </div>
        );
    }

    // Si el rol es Admin o Encargado, muestra el dashboard
    if (user && (user.rol === 'Admin' || user.rol === 'Encargado/Cajero')) {
        return <AdminDashboard />;
    }

    // Si el rol es null o desconocido, muestra pendiente
    if (user && !user.rol) {
        return <CuentaPendiente />;
    }

    // Si es Cliente o Cocina, estará redirigiendo,
    // pero mostramos un loader por si acaso.
    return (
        <div className={styles.dashboardContainer} style={{ textAlign: 'center', paddingTop: '5rem' }}>
            <Loader2 size={48} className={styles.spinner} />
            <p>Redirigiendo...</p>
        </div>
    );
};

export default InicioPage;