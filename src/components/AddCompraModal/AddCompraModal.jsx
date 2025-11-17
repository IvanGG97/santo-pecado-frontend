import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../../services/api';
import styles from './AddCompraModal.module.css';
import Swal from 'sweetalert2';
import InsumoSearchModal from '../InsumoSearchModal/InsumoSearchModal';
import ProveedorManagerModal from '../ProveedorManagerModal/ProveedorManagerModal';

// Opciones de pago (basadas en tu models.py)
const METODOS_PAGO = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia Bancaria' }
];

// --- Helper para unidades ---
const getUnidadesDeCompra = (unidadBase) => {
    if (unidadBase === 'Gramos') {
        return ['Gramos', 'Kg'];
    }
    if (unidadBase === 'Unidad') {
        return ['Unidad', 'Docena', 'Fardo (x6)'];
    }
    return [unidadBase];
};

// --- Helper de conversión ---
const getConversionFactor = (unidadCompra, unidadBase) => {
    if (unidadCompra === unidadBase) return 1.0;
    if (unidadBase === 'Gramos' && unidadCompra === 'Kg') return 1000;
    if (unidadBase === 'Unidad' && unidadCompra === 'Docena') return 12;
    if (unidadBase === 'Unidad' && unidadCompra === 'Fardo (x6)') return 6;
    return 1.0;
};

const AddCompraModal = ({ onClose, onSuccess }) => {
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedProveedor, setSelectedProveedor] = useState(null);
    const [selectedMetodoPago, setSelectedMetodoPago] = useState('efectivo');

    const [detalles, setDetalles] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
    const [isInsumoModalOpen, setIsInsumoModalOpen] = useState(false);

    const fetchProveedores = useCallback(async () => {
        setLoading(true);
        try {
            const resProveedores = await apiClient.get('/compra/proveedores/');
            setProveedores(resProveedores.data);
        } catch (err) {
            console.error("Error al cargar proveedores", err);
            setError("No se pudieron cargar los proveedores.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProveedores();
    }, [fetchProveedores]);

    const totalCompra = useMemo(() => {
        return detalles.reduce((total, item) => {
            const cantidad = parseFloat(item.cantidad_compra) || 0;
            const precio = parseFloat(item.precio_compra) || 0;
            return total + (cantidad * precio);
        }, 0);
    }, [detalles]);

    // --- Manejadores de Detalles ---

    const handleInsumoSelected = (insumo) => {
        if (detalles.find(item => item.insumo === insumo.id)) {
            Swal.fire('Atención', 'Ese insumo ya está en la lista. Puedes editar la cantidad.', 'info');
            return;
        }

        const nuevoDetalle = {
            id: Date.now(),
            insumo: insumo.id,
            insumo_nombre: insumo.insumo_nombre,
            insumo_unidad_base: insumo.insumo_unidad,
            cantidad_compra: 1,
            unidad_compra: insumo.insumo_unidad,
            precio_compra: ''
        };
        setDetalles([...detalles, nuevoDetalle]);
        setIsInsumoModalOpen(false);
    };

    const handleRemoveDetalle = (id) => {
        setDetalles(detalles.filter(item => item.id !== id));
    };

    const handleDetalleChange = (id, e) => {
        const { name, value } = e.target;

        setDetalles(prevDetalles =>
            prevDetalles.map(item => {
                if (item.id !== id) return item;
                return { ...item, [name]: value };
            })
        );
    };

    const handleProveedorManagerSuccess = (proveedor) => {
        fetchProveedores();
        setSelectedProveedor(proveedor);
        setIsProveedorModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedProveedor) {
            setError('Debe seleccionar un proveedor.');
            return;
        }
        if (detalles.length === 0) {
            setError('La compra debe tener al menos un insumo.');
            return;
        }

        const detallesValidos = [];
        for (const item of detalles) {
            const { insumo, cantidad_compra, unidad_compra, precio_compra, insumo_unidad_base, insumo_nombre } = item;

            const numCantidad = parseFloat(cantidad_compra);
            const numPrecio = parseFloat(precio_compra);

            if (!insumo || isNaN(numCantidad) || numCantidad <= 0 || isNaN(numPrecio) || numPrecio < 0) {
                setError(`El insumo "${insumo_nombre}" está incompleto o tiene valores inválidos.`);
                return;
            }

            const factor = getConversionFactor(unidad_compra, insumo_unidad_base);

            const backend_cantidad_raw = numCantidad * factor;
            const backend_precio_unitario_raw = factor > 0 ? (numPrecio / factor) : 0;

            const backend_cantidad = Math.round(backend_cantidad_raw * 100) / 100;
            const backend_precio_unitario = Math.round(backend_precio_unitario_raw * 100) / 100;

            detallesValidos.push({
                insumo: insumo,
                detalle_compra_cantidad: backend_cantidad,
                detalle_compra_precio_unitario: backend_precio_unitario
            });
        }

        const payload = {
            proveedor: selectedProveedor.id,
            compra_metodo_pago: selectedMetodoPago,
            detalles: detallesValidos
        };

        setIsSubmitting(true);

        try {
            await apiClient.post('/compra/compras/', payload);
            Swal.fire('¡Éxito!', 'La compra ha sido registrada y el stock actualizado.', 'success');
            onSuccess();

        } catch (error) {
            console.error("Error al registrar la compra:", error.response?.data || error);
            const errorMsg = error.response?.data?.detail || "No se pudo registrar la compra.";
            setError(errorMsg);
            Swal.fire('Error', errorMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className={styles.modalBackdrop}>
                <div className={styles.modalContent}>
                    <button onClick={onClose} className={styles.closeButton} disabled={isSubmitting}>&times;</button>
                    <h2>Registrar Nueva Compra</h2>

                    {loading ? (
                        <p>Cargando datos...</p>
                    ) : (
                        <form onSubmit={handleSubmit} className={styles.form}>

                            {/* --- Sección Principal (Proveedor y Pago) --- */}
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="proveedor">Proveedor</label>
                                    <div className={styles.inputGroup}>
                                        <div className={styles.proveedorDisplay}>
                                            {selectedProveedor ? selectedProveedor.proveedor_nombre : "Ningún proveedor seleccionado"}
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.manageButton}
                                            onClick={() => setIsProveedorModalOpen(true)}
                                            title="Buscar / Gestionar Proveedores"
                                        >
                                            Buscar
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="compra_metodo_pago">Método de Pago</label>
                                    <select
                                        id="compra_metodo_pago"
                                        name="compra_metodo_pago"
                                        value={selectedMetodoPago}
                                        onChange={(e) => setSelectedMetodoPago(e.target.value)}
                                        className={styles.input}
                                        required
                                    >
                                        {METODOS_PAGO.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* --- Sección Detalles (Insumos) --- */}
                            <div className={styles.detallesContainer}>
                                <h4>Insumos Comprados</h4>
                                <div className={`${styles.detalleRow} ${styles.detallesHeader}`}>
                                    <span>Insumo (Unidad Base)</span>
                                    <span>Cantidad</span>
                                    <span>Unidad Compra</span>
                                    <span>Precio por Unidad</span>
                                    <span>Subtotal</span>
                                    <span>Quitar</span>
                                </div>

                                <div className={styles.detallesList}>
                                    {detalles.length === 0 && (
                                        <p className={styles.noInsumos}>Aún no hay insumos en la compra.</p>
                                    )}
                                    {detalles.map((item) => (
                                        <div key={item.id} className={`${styles.detalleRow} ${styles.detalleRowInputs}`}>
                                            {/* Insumo (Texto) */}
                                            <span className={styles.detalleInsumoNombre}>
                                                {item.insumo_nombre}
                                                <small>Base: {item.insumo_unidad_base}</small>
                                            </span>
                                            {/* Input Cantidad Compra */}
                                            <input
                                                type="number"
                                                name="cantidad_compra"
                                                value={item.cantidad_compra}
                                                onChange={(e) => handleDetalleChange(item.id, e)}
                                                className={styles.detalleInput}
                                                placeholder="Ej: 1.5"
                                                step="0.01"
                                                min="0.01"
                                                required
                                            />
                                            {/* Select Unidad Compra */}
                                            <select
                                                name="unidad_compra"
                                                value={item.unidad_compra}
                                                onChange={(e) => handleDetalleChange(item.id, e)}
                                                className={styles.detalleSelect}
                                                required
                                            >
                                                {getUnidadesDeCompra(item.insumo_unidad_base).map(unidad => (
                                                    <option key={unidad} value={unidad}>{unidad}</option>
                                                ))}
                                            </select>
                                            {/* Input Precio Compra */}
                                            <input
                                                type="number"
                                                name="precio_compra"
                                                value={item.precio_compra}
                                                onChange={(e) => handleDetalleChange(item.id, e)}
                                                className={styles.detalleInput}
                                                placeholder={`Precio por ${item.unidad_compra}`}
                                                step="0.01"
                                                min="0"
                                                required
                                            />
                                            {/* Subtotal (Calculado) */}
                                            <span className={styles.subtotal}>
                                                ${((parseFloat(item.cantidad_compra) || 0) * (parseFloat(item.precio_compra) || 0)).toFixed(2)}
                                            </span>
                                            {/* Botón Quitar Fila */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDetalle(item.id)}
                                                className={styles.removeButton}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsInsumoModalOpen(true)}
                                    className={styles.addDetalleButton}
                                >
                                    + Buscar y Añadir Insumo
                                </button>
                            </div>

                            {/* --- Sección Total y Guardar --- */}
                            <div className={styles.totalContainer}>
                                <h3>Total Compra: ${new Intl.NumberFormat('es-AR').format(totalCompra)}</h3>
                            </div>

                            {error && <p className={styles.errorText}>{error}</p>}

                            <div className={styles.buttons}>
                                <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading || isSubmitting} className={styles.saveButton}>
                                    {isSubmitting ? 'Guardando...' : 'Guardar Compra'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* --- Renderizado de los Modales Anidados --- */}
            {isInsumoModalOpen && (
                <InsumoSearchModal
                    onClose={() => setIsInsumoModalOpen(false)}
                    onInsumoSelected={handleInsumoSelected}
                />
            )}

            {isProveedorModalOpen && (
                <ProveedorManagerModal
                    onClose={() => setIsProveedorModalOpen(false)}
                    onProveedorSeleccionado={handleProveedorManagerSuccess}
                    initialProveedores={proveedores}
                />
            )}
        </>
    );
};

export default AddCompraModal;