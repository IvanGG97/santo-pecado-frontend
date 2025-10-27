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
    
    // Estados de imagen local eliminados
    // const [imageFile, setImageFile] = useState(null);
    // const [previewImage, setPreviewImage] = useState(null);
    
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
                promocion_fecha_hora_inicio: promocion.promocion_fecha_hora_inicio ? promocion.promocion_fecha_hora_inicio.slice(0, 10) : '',
                promocion_fecha_hora_fin: promocion.promocion_fecha_hora_fin ? promocion.promocion_fecha_hora_fin.slice(0, 10) : '',
                promocion_stock: promocion.promocion_stock || '',
                promocion_descripcion: promocion.promocion_descripcion || '',
                promocion_imagen_url: promocion.promocion_imagen_url || '',
                promocion_estado: promocion.promocion_estado,
            });
            const initialSelection = {};
            promocion.productos_promocion?.forEach(item => {
                initialSelection[item.producto.id] = item.cantidad;
            });
            setProductosSeleccionados(initialSelection);
            // setPreviewImage(promocion.promocion_imagen || promocion.promocion_imagen_url); // Eliminado
        }
    }, [promocion, isEditMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Funciones 'handleFileChange' y 'handleDeleteImage' eliminadas

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

    // --- handleSubmit SIMPLIFICADO (SOLO JSON) ---
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

        // El payload es siempre un objeto JSON
        const payload = {
            ...formData,
            productos: productosPayload,
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
            // No cerramos el modal en caso de error
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
                        <input name="promocion_stock" value={formData.promocion_stock} onChange={handleChange} type="number" min="0" className={styles.input} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Descripción</label>
                        <textarea name="promocion_descripcion" value={formData.promocion_descripcion} onChange={handleChange} className={styles.textarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Fecha de Inicio (Opcional)</label>
                        <input name="promocion_fecha_hora_inicio" value={formData.promocion_fecha_hora_inicio} onChange={handleChange} type="date" className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Fecha de Fin (Opcional)</label>
                        <input name="promocion_fecha_hora_fin" value={formData.promocion_fecha_hora_fin} onChange={handleChange} type="date" className={styles.input} />
                    </div>

                    {/* --- SECCIÓN DE IMAGEN SIMPLIFICADA --- */}
                    <div className={styles.formGroup}>
                        <label>URL de Imagen (Opcional)</label>
                        <input name="promocion_imagen_url" value={formData.promocion_imagen_url} onChange={handleChange} className={styles.input} type="text" placeholder="https://ejemplo.com/imagen.jpg" autoComplete="off" />
                    </div>
                    {/* ------------------------------- */}

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

