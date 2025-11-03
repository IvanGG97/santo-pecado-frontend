import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. IMPORTAR useNavigate
import apiClient from '../../services/api';
import styles from './ComprasPage.module.css';
import Swal from 'sweetalert2';
import AddCompraModal from '../../components/AddCompraModal/AddCompraModal';

const ComprasPage = () => {
    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(true); // Este 'loading' es para los datos de compras
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- 2. NUEVOS ESTADOS Y HOOKS ---
    const [isVerifyingCaja, setIsVerifyingCaja] = useState(true);
    const navigate = useNavigate();
    // --- FIN NUEVOS ESTADOS ---

    // Función para cargar las compras (Sin cambios)
    const fetchCompras = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
        }
        try {
            const response = await apiClient.get('/compra/compras/');
            setCompras(response.data.sort((a, b) => new Date(b.compra_fecha_hora) - new Date(a.compra_fecha_hora)));
            setError(null);
        } catch (error) {
            console.error("Error al cargar compras:", error);
            setError("No se pudieron cargar las compras.");
            Swal.fire('Error', 'No se pudieron cargar las compras.', 'error');
        } finally {
            if (showLoading) {
                setLoading(false);
            }
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


    // --- 4. MODIFICACIÓN Carga inicial (depende de la verificación) ---
    useEffect(() => {
        // Solo carga las compras si la verificación de caja fue exitosa
        if (!isVerifyingCaja) {
            fetchCompras(true);
        }
    }, [fetchCompras, isVerifyingCaja]); // Añadida dependencia


    // --- Handlers (Sin cambios) ---
    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleCompraSuccess = () => {
        handleCloseModal();
        fetchCompras(false);
    };


    // --- 5. NUEVO RENDERIZADO DE VERIFICACIÓN ---
    if (isVerifyingCaja) {
        // Muestra un loader simple mientras verifica la caja
        return (
            <div className={styles.comprasContainer} style={{ padding: '2rem', textAlign: 'center' }}>
                Verificando estado de la caja...
            </div>
        );
    }
    // --- FIN DE NUEVO RENDERIZADO ---


    // --- Renderizado Principal (Solo se muestra si isVerifyingCaja es false) ---
    return (
        <div className={styles.comprasContainer}>
            <h1>Registro de Compras</h1>

            <div className={styles.toolbar}>
                <button className={styles.addButton} onClick={handleOpenModal}>
                    Registrar Nueva Compra
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <p>Cargando historial de compras...</p>
                ) : error ? (
                    <p className={styles.errorText}>{error}</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID Compra</th>
                                <th>Fecha y Hora</th>
                                <th>Proveedor</th>
                                <th>Empleado</th>
                                <th>Total</th>
                                <th>Método de Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            {compras.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center' }}>No se encontraron compras.</td>
                                </tr>
                            ) : (
                                compras.map(compra => (
                                    <tr key={compra.id}>
                                        <td>{compra.id}</td>
                                        <td>{new Date(compra.compra_fecha_hora).toLocaleString()}</td>
                                        <td>{compra.proveedor || 'N/A'}</td>
                                        <td>{compra.empleado ? `${compra.empleado.first_name} ${compra.empleado.last_name}`.trim() : 'N/A'}</td>
                                        <td>${new Intl.NumberFormat('es-AR').format(compra.compra_total)}</td>
                                        <td>{compra.compra_metodo_pago}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <AddCompraModal
                    s onClose={handleCloseModal}
                    onSuccess={handleCompraSuccess}
                />
            )}
        </div>
    );
};

export default ComprasPage;