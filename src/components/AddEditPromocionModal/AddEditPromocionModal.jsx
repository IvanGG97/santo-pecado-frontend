import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './AddEditPromocionModal.module.css';
import Swal from 'sweetalert2';

const AddEditPromocionModal = ({ promocion, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        promocion_nombre: '',
        promocion_precio: '',
        promocion_fecha_hora_inicio: '',
        promocion_fecha_hora_fin: '',
        promocion_stock: '',
        promocion_descripcion: '',
    });
    const [productosSeleccionados, setProductosSeleccionados] = useState({});
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const isEditMode = Boolean(promocion);

    useEffect(() => {
        apiClient.get('/inventario/productos/')
            .then(res => setProductosDisponibles(res.data))
            .catch(err => console.error("Error al cargar productos", err));
    }, []);

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                promocion_nombre: promocion.promocion_nombre || '',
                promocion_precio: promocion.promocion_precio || '',
                // Formateamos las fechas a YYYY-MM-DD para el input de tipo 'date'
                promocion_fecha_hora_inicio: promocion.promocion_fecha_hora_inicio ? promocion.promocion_fecha_hora_inicio.slice(0, 10) : '',
                promocion_fecha_hora_fin: promocion.promocion_fecha_hora_fin ? promocion.promocion_fecha_hora_fin.slice(0, 10) : '',
                promocion_stock: promocion.promocion_stock || '',
                promocion_descripcion: promocion.promocion_descripcion || '',
            });
            const initialSelection = {};
            promocion.productos_promocion?.forEach(item => {
                initialSelection[item.producto.id] = item.cantidad;
            });
            setProductosSeleccionados(initialSelection);
        }
    }, [promocion, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
            const newQty = Math.max(1, currentQty + amount);
            return { ...prev, [productoId]: newQty };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const productosPayload = Object.keys(productosSeleccionados).map(id => ({
            producto_id: parseInt(id),
            cantidad: productosSeleccionados[id],
        }));

        if (productosPayload.length === 0) {
            Swal.fire('Atención', 'Debes seleccionar al menos un producto para la promoción.', 'warning');
            setLoading(false);
            return;
        }

        const payload = { ...formData, productos: productosPayload };
        // --- LÓGICA DE FECHAS CORREGIDA ---
        // Si la fecha está vacía, la enviamos como null. Si no, la enviamos como está.
        payload.promocion_fecha_hora_inicio = payload.promocion_fecha_hora_inicio || null;
        payload.promocion_fecha_hora_fin = payload.promocion_fecha_hora_fin || null;
        
        try {
            if (isEditMode) {
                await apiClient.put(`/promocion/promociones/${promocion.id}/`, payload);
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
                    {/* ... (otros campos) ... */}
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
                        <input name="promocion_stock" value={formData.promocion_stock} onChange={handleChange} type="number" min="0" className={styles.input} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Descripción</label>
                        <textarea name="promocion_descripcion" value={formData.promocion_descripcion} onChange={handleChange} className={styles.textarea}></textarea>
                    </div>

                     {/* --- INPUTS DE FECHA ACTUALIZADOS --- */}
                     <div className={styles.formGroup}>
                        <label>Fecha de Inicio (Opcional)</label>
                        <input name="promocion_fecha_hora_inicio" value={formData.promocion_fecha_hora_inicio} onChange={handleChange} type="date" className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Fecha de Fin (Opcional)</label>
                        <input name="promocion_fecha_hora_fin" value={formData.promocion_fecha_hora_fin} onChange={handleChange} type="date" className={styles.input} />
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

