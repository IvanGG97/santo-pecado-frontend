import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './AddEditPromocionModal.module.css';
import Swal from 'sweetalert2';

// Versión simplificada: sin subida de archivos locales
const AddEditPromocionModal = ({ promocion, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        promocion_nombre: '',
        promocion_precio: '',
        promocion_fecha_hora_inicio: '',
        promocion_fecha_hora_fin: '',
        promocion_stock: '',
        promocion_descripcion: '',
        promocion_imagen_url: '',
        promocion_estado: true,
    });
    
    const [productosSeleccionados, setProductosSeleccionados] = useState({});
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const isEditMode = Boolean(promocion);

    // Obtener fecha de hoy en formato YYYY-MM-DD para los atributos 'min'
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        apiClient.get('/inventario/productos/')
            .then(res => setProductosDisponibles(res.data))
            .catch(err => console.error("Error al cargar productos", err));
    }, []);

    useEffect(() => {
        if (isEditMode) {
            // Parseamos las fechas para comparar
            const fechaFinStr = promocion.promocion_fecha_hora_fin ? promocion.promocion_fecha_hora_fin.slice(0, 10) : '';
            let estadoInicial = promocion.promocion_estado;

            // Regla: Si la fecha de fin ya pasó, la promo debe aparecer como NO disponible
            if (fechaFinStr && fechaFinStr < today) {
                estadoInicial = false;
            }

            setFormData({
                promocion_nombre: promocion.promocion_nombre || '',
                promocion_precio: promocion.promocion_precio || '',
                promocion_fecha_hora_inicio: promocion.promocion_fecha_hora_inicio ? promocion.promocion_fecha_hora_inicio.slice(0, 10) : '',
                promocion_fecha_hora_fin: fechaFinStr,
                promocion_stock: promocion.promocion_stock || '',
                promocion_descripcion: promocion.promocion_descripcion || '',
                promocion_imagen_url: promocion.promocion_imagen_url || '',
                promocion_estado: estadoInicial,
            });
            
            const initialSelection = {};
            promocion.productos_promocion?.forEach(item => {
                initialSelection[item.producto.id] = item.cantidad;
            });
            setProductosSeleccionados(initialSelection);
        }
    }, [promocion, isEditMode, today]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // --- VALIDACIÓN ESPECIAL PARA EL SWITCH DE ESTADO ---
        if (name === 'promocion_estado' && checked === true) {
            // Si el usuario quiere ACTIVAR la promo, verificamos la fecha fin
            const fechaFin = formData.promocion_fecha_hora_fin;
            
            if (fechaFin && fechaFin < today) {
                Swal.fire({
                    title: 'No se puede activar',
                    text: 'La fecha de finalización es anterior a hoy. Cambia la fecha de fin a una futura para poder habilitar la promoción.',
                    icon: 'warning'
                });
                return; // No permitimos el cambio a true
            }
        }
        // ----------------------------------------------------

        // --- VALIDACIÓN PARA STOCK (SOLO ENTEROS) ---
        if (name === 'promocion_stock') {
            // Si escribe un punto o coma, lo ignoramos
            if (value.includes('.') || value.includes(',')) return;
        }
        // ---------------------------------------------

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleProductoSelect = (productoId) => {
        setProductosSeleccionados(prev => {
            const newSelection = { ...prev };
            if (newSelection[productoId]) {
                delete newSelection[productoId];
            } else {
                newSelection[productoId] = 1;
            }
            return newSelection;
        });
    };

    const handleQuantityChange = (productoId, amount) => {
        setProductosSeleccionados(prev => {
            const currentQty = prev[productoId] || 0;
            // Aseguramos enteros con Math.floor por si acaso
            const newQty = Math.max(1, Math.floor(currentQty + amount));
            return { ...prev, [productoId]: newQty };
        });
    };

    // --- handleSubmit ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // --- 1. Validación Manual de Stock (Entero) ---
        if (!Number.isInteger(parseFloat(formData.promocion_stock))) {
            Swal.fire('Error', 'El stock debe ser un número entero.', 'error');
            return;
        }

        // --- 2. Validación de Fechas ---
        if (formData.promocion_fecha_hora_inicio && formData.promocion_fecha_hora_fin) {
            if (formData.promocion_fecha_hora_fin < formData.promocion_fecha_hora_inicio) {
                Swal.fire('Error en Fechas', 'La fecha de fin no puede ser anterior a la fecha de inicio.', 'error');
                return;
            }
        }
        // ------------------------------

        setLoading(true);

        const productosPayload = Object.keys(productosSeleccionados).map(id => ({
            producto_id: parseInt(id),
            cantidad: parseInt(productosSeleccionados[id]), // Aseguramos entero
        }));

        if (productosPayload.length === 0) {
            Swal.fire('Atención', 'Debes seleccionar al menos un producto para la promoción.', 'warning');
            setLoading(false);
            return;
        }

        const payload = {
            ...formData,
            productos: productosPayload,
            promocion_stock: parseInt(formData.promocion_stock), // Enviamos como entero
            promocion_fecha_hora_inicio: formData.promocion_fecha_hora_inicio || null,
            promocion_fecha_hora_fin: formData.promocion_fecha_hora_fin || null,
        };
        
        try {
            if (isEditMode) {
                await apiClient.patch(`/promocion/promociones/${promocion.id}/`, payload);
            } else {
                await apiClient.post('/promocion/promociones/', payload);
            }
            Swal.fire('¡Éxito!', 'La promoción ha sido guardada.', 'success');
            onSuccess();
        } catch (error) {
            console.error("Error detallado del backend:", error.response?.data);
            const errorData = error.response?.data;
            let errorMessage = 'No se pudo guardar la promoción.';
            if (typeof errorData === 'object' && errorData !== null) {
                errorMessage = Object.entries(errorData)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('; ');
            }
            Swal.fire('Error de Validación', errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const filteredProductos = productosDisponibles.filter(p => p.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>{isEditMode ? 'Editar' : 'Añadir'} Promoción</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Nombre de la Promoción</label>
                        <input name="promocion_nombre" value={formData.promocion_nombre} onChange={handleChange} className={styles.input} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Precio</label>
                        <input name="promocion_precio" value={formData.promocion_precio} onChange={handleChange} type="number" step="0.01" min="0" className={styles.input} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Stock</label>
                        <input 
                            name="promocion_stock" 
                            value={formData.promocion_stock} 
                            onChange={handleChange} 
                            type="number" 
                            step="1"      // Forzamos paso de 1 en el UI
                            min="0" 
                            className={styles.input} 
                            required 
                            placeholder="Ej: 50"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Descripción</label>
                        <textarea name="promocion_descripcion" value={formData.promocion_descripcion} onChange={handleChange} className={styles.textarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Fecha de Inicio (Opcional)</label>
                        <input 
                            name="promocion_fecha_hora_inicio" 
                            value={formData.promocion_fecha_hora_inicio} 
                            onChange={handleChange} 
                            type="date" 
                            min={today} // No permite fechas pasadas
                            className={styles.input} 
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Fecha de Fin (Opcional)</label>
                        <input 
                            name="promocion_fecha_hora_fin" 
                            value={formData.promocion_fecha_hora_fin} 
                            onChange={handleChange} 
                            type="date" 
                            // Mínimo: La fecha de inicio seleccionada O el día de hoy
                            min={formData.promocion_fecha_hora_inicio || today} 
                            className={styles.input} 
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>URL de Imagen (Opcional)</label>
                        <input name="promocion_imagen_url" value={formData.promocion_imagen_url} onChange={handleChange} className={styles.input} type="text" placeholder="https://ejemplo.com/imagen.jpg" autoComplete="off" />
                    </div>

                    <div className={`${styles.formGroup} ${styles.switchGroup}`}>
                        <label>Promoción Activa</label>
                        <div>
                            <input
                                id="promocion-estado-switch"
                                name="promocion_estado"
                                type="checkbox"
                                className={styles.switchInput}
                                checked={formData.promocion_estado}
                                onChange={handleChange}
                            />
                            <label htmlFor="promocion-estado-switch" className={styles.switchLabel}></label>
                        </div>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Productos Incluidos</label>
                        <input type="text" placeholder="Buscar producto..." className={styles.searchInput} onChange={(e) => setSearchTerm(e.target.value)} />
                        <div className={styles.checkboxContainer}>
                            {filteredProductos.map(p => (
                                <div key={p.id} className={styles.checkboxItem}>
                                    <input type="checkbox" id={`promo-producto-${p.id}`} checked={!!productosSeleccionados[p.id]} onChange={() => handleProductoSelect(p.id)} />
                                    <img src={p.producto_imagen || p.producto_imagen_url || 'https://placehold.co/40x40/e1e1e1/777?text=N/A'} alt={p.producto_nombre} className={styles.productImage} />
                                    <label htmlFor={`promo-producto-${p.id}`} className={styles.productLabel}>
                                        <span>{p.producto_nombre}</span>
                                        <span className={styles.productPrice}>${new Intl.NumberFormat('es-AR').format(p.producto_precio)}</span>
                                    </label>
                                    {productosSeleccionados[p.id] && (
                                        <div className={styles.quantityStepper}>
                                            <button type="button" onClick={() => handleQuantityChange(p.id, -1)}>-</button>
                                            <span>{productosSeleccionados[p.id]}</span>
                                            <button type="button" onClick={() => handleQuantityChange(p.id, 1)}>+</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.buttons}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                        <button type="submit" disabled={loading} className={styles.saveButton}>{loading ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditPromocionModal;