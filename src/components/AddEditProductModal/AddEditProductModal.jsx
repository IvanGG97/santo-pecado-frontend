import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './AddEditProductModal.module.css';
import Swal from 'sweetalert2';

// Versión final con vista previa y eliminación de imagen
const AddEditProductModal = ({ product, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        producto_nombre: '',
        producto_descripcion: '',
        producto_precio: '',
        tipo_producto: '',
        producto_imagen_url: '',
        producto_disponible: true,
    });
    const [imageFile, setImageFile] = useState(null);
    const [tiposProducto, setTiposProducto] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const isEditMode = Boolean(product);

    // --- NUEVOS ESTADOS ---
    const [allInsumos, setAllInsumos] = useState([]);
    const [existingProducts, setExistingProducts] = useState([]); // Para validar duplicados
    const [receta, setReceta] = useState({}); // { insumoId: cantidad }
    const [insumoSearch, setInsumoSearch] = useState('');

    useEffect(() => {
        // Cargar datos necesarios: Tipos, Insumos y PRODUCTOS EXISTENTES
        const fetchData = async () => {
            try {
                const [resTipos, resInsumos, resProductos] = await Promise.all([
                    apiClient.get('/inventario/tipos-producto/'),
                    apiClient.get('/inventario/insumos/'),
                    apiClient.get('/inventario/productos/') // Cargamos todos los productos
                ]);
                
                setTiposProducto(resTipos.data);
                setAllInsumos(resInsumos.data);
                setExistingProducts(resProductos.data); // Guardamos para validar después

            } catch (err) {
                console.error("Error al cargar datos iniciales", err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (isEditMode && tiposProducto.length > 0 && allInsumos.length > 0) {
            const tipo = tiposProducto.find(t => t.tipo_producto_nombre === product.tipo_producto);
            setFormData({
                producto_nombre: product.producto_nombre || '',
                producto_descripcion: product.producto_descripcion || '',
                producto_precio: product.producto_precio || '',
                tipo_producto: tipo ? tipo.id : '',
                producto_imagen_url: product.producto_imagen_url || '',
                producto_disponible: product.producto_disponible,
            });
            setPreviewImage(product.producto_imagen || product.producto_imagen_url);

            // Pre-cargar la receta existente del producto
            if (product.receta) {
                const initialReceta = {};
                product.receta.forEach(item => {
                    if(item.insumo) {
                        initialReceta[item.insumo.id] = item.producto_insumo_cantidad;
                    }
                });
                setReceta(initialReceta);
            }
        }
    }, [product, isEditMode, tiposProducto, allInsumos]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // --- VALIDACIÓN DE PRECIO EN TIEMPO REAL ---
        if (name === "producto_precio") {
            if (value === "") {
                setFormData(prev => ({ ...prev, [name]: "" }));
                return;
            }
            const numValue = parseFloat(value);
            if (numValue > 10000000) { // Límite de 10 millones
                return; // No actualiza el estado si se pasa
            }
        }
        // --- FIN VALIDACIÓN ---

        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewImage(URL.createObjectURL(file));
        } else {
            setImageFile(null);
        }
    };

    const handleDeleteImage = () => {
        setPreviewImage(null);
        setImageFile(null);
        setFormData(prev => ({ ...prev, producto_imagen_url: '' }));
        const fileInput = document.querySelector('input[name="producto_imagen"]');
        if (fileInput) fileInput.value = '';
    };

    // --- MANEJADORES DE RECETA (MODIFICADO PARA VALIDAR UNIDADES) ---
    const handleInsumoSelect = (insumoId) => {
        setReceta(prev => {
            const newReceta = { ...prev };
            if (newReceta.hasOwnProperty(insumoId)) {
                delete newReceta[insumoId];
            } else {
                newReceta[insumoId] = 1;
            }
            return newReceta;
        });
    };

    const handleRecetaQuantityChange = (insumoId, cantidadStr) => {
        // 1. Buscar el insumo para saber su unidad
        const insumo = allInsumos.find(i => i.id === insumoId);
        const isUnidad = insumo?.insumo_unidad === 'Unidad';

        // 2. Si es 'Unidad', no permitir puntos ni comas
        if (isUnidad) {
            if (cantidadStr.includes('.') || cantidadStr.includes(',')) {
                return; // Ignora el cambio si hay decimales
            }
        }

        if (cantidadStr === '') {
            setReceta(prev => ({ ...prev, [insumoId]: '' }));
            return;
        }
        const newCantidad = parseFloat(cantidadStr);
        if (!isNaN(newCantidad) && newCantidad >= 0) {
            setReceta(prev => ({ ...prev, [insumoId]: newCantidad }));
        }
    };

    const handleRecetaQuantityStep = (insumoId, amount) => {
        setReceta(prev => {
            const currentQty = parseFloat(prev[insumoId]) || 0;
            // Buscar insumo para saber el step correcto (opcional, aquí usamos 1 genérico para botones)
            // Pero si quisieras que el botón sume 0.1 en gramos, podrías buscar el insumo aquí.
            // Por ahora mantenemos +/- 1 o +/- 0.1 dependiendo de lo que quieras.
            // Si es 'Unidad' el step es 1. Si es 'Gramos' quizás quieras sumar de a 10 o 100 gramos, o 0.1 si es kilos.
            
            // Lógica simple: sumar 1 unidad
            const step = (amount > 0 ? 1 : -1); 
            let newQty = currentQty + step;
            if (newQty < 0) newQty = 0;
            
            return { ...prev, [insumoId]: newQty };
        });
    };

    // --- Función auxiliar para normalizar strings ---
    const normalizeString = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // --- handleSubmit ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Validación nativa del navegador
        if (!e.target.checkValidity()) {
            e.target.reportValidity();
            Swal.fire('Datos Inválidos', 'Por favor, corrige los errores marcados en el formulario.', 'warning');
            return; 
        }

        // 2. Validación de Duplicados
        const normalizedNewName = normalizeString(formData.producto_nombre.trim());
        
        const isDuplicate = existingProducts.some(existingProd => {
            // Si estamos editando, ignoramos el producto actual
            if (isEditMode && existingProd.id === product.id) {
                return false;
            }
            const normalizedExistingName = normalizeString(existingProd.producto_nombre);
            return normalizedExistingName === normalizedNewName;
        });

        if (isDuplicate) {
            Swal.fire({
                icon: 'warning',
                title: 'Producto Duplicado',
                text: 'Ya existe un producto con este nombre. Por favor, elige otro.',
            });
            return; // Detiene el envío
        }

        setLoading(true);

        let payload;
        let requestFn;
        
        const recetaPayload = Object.keys(receta)
            .filter(id => (parseFloat(receta[id]) || 0) > 0)
            .map(id => ({
                insumo_id: parseInt(id),
                cantidad: parseFloat(receta[id])
            }));

        if (imageFile) {
            payload = new FormData();
            Object.keys(formData).forEach(key => payload.append(key, formData[key]));
            payload.append('producto_imagen', imageFile);
            payload.set('producto_imagen_url', '');
            payload.append('receta', JSON.stringify(recetaPayload));

            requestFn = isEditMode
                ? () => apiClient.patch(`/inventario/productos/${product.id}/`, payload)
                : () => apiClient.post('/inventario/productos/', payload);

        } else {
            payload = { ...formData, receta: recetaPayload };
            if (isEditMode && !previewImage) {
                payload.producto_imagen = null;
                payload.producto_imagen_url = null;
            } else if (isEditMode && previewImage) {
                delete payload.producto_imagen;
                if (payload.producto_imagen_url === product.producto_imagen_url) {
                   delete payload.producto_imagen_url;
                }
            }

            requestFn = isEditMode
                ? () => apiClient.patch(`/inventario/productos/${product.id}/`, payload)
                : () => apiClient.post('/inventario/productos/', payload);
        }
        
        try {
            await requestFn();
            Swal.fire('¡Éxito!', `El producto ha sido ${isEditMode ? 'actualizado' : 'creado'}.`, 'success');
            onSuccess();
        } catch (error) {
            Swal.fire('Error', `No se pudo ${isEditMode ? 'actualizar' : 'crear'} el producto.`, 'error');
            console.error("Error en el formulario:", error.response?.data || error);
        } finally {
            setLoading(false);
            onClose();
        }
    };

    const filteredInsumos = allInsumos.filter(i => 
        i.insumo_nombre.toLowerCase().includes(insumoSearch.toLowerCase())
    );

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>{isEditMode ? 'Editar' : 'Añadir'} Producto</h2>
                
                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                    
                    <div className={styles.formGroup}>
                        <label>Nombre</label>
                        <input 
                            name="producto_nombre" 
                            value={formData.producto_nombre} 
                            onChange={handleChange} 
                            className={styles.input} 
                            required 
                            maxLength={100} 
                        />
                        <small className={styles.charCounter}>
                            {formData.producto_nombre.length} / 100
                        </small>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Descripción</label>
                        <textarea
                            name="producto_descripcion" 
                            value={formData.producto_descripcion} 
                            onChange={handleChange} 
                            className={styles.input} 
                            maxLength={250} 
                            rows={3} 
                        />
                        <small className={styles.charCounter}>
                            {formData.producto_descripcion.length} / 250
                        </small>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Precio</label>
                        <input 
                            name="producto_precio" 
                            value={formData.producto_precio} 
                            onChange={handleChange} 
                            className={styles.input} 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max="10000000" 
                            required 
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Tipo de Producto</label>
                        <select name="tipo_producto" value={formData.tipo_producto} onChange={handleChange} className={styles.input} required>
                            <option value="">-- Seleccionar --</option>
                            {tiposProducto.map(tipo => ( <option key={tipo.id} value={tipo.id}>{tipo.tipo_producto_nombre}</option> ))}
                        </select>
                    </div>

                    {/* SECCIÓN DE IMAGEN */}
                    {previewImage && (
                        <div className={styles.imagePreviewContainer}>
                            <label>Imagen Actual</label>
                            <img src={previewImage} alt="Vista previa" className={styles.imagePreview} />
                            <button type="button" onClick={handleDeleteImage} className={styles.deleteImageButton}>Eliminar Imagen</button>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label>Imagen (Subir Archivo)</label>
                        <input name="producto_imagen" onChange={handleFileChange} className={styles.input} type="file" accept="image/*" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>URL de Imagen (Alternativa)</label>
                        <input name="producto_imagen_url" value={formData.producto_imagen_url} onChange={handleChange} className={styles.input} type="text" placeholder="https://ejemplo.com/imagen.jpg" autoComplete="off" />
                    </div>
                    
                    {/* --- SECCIÓN DE RECETA (INSUMOS) --- */}
                    <div className={styles.formGroup}>
                        <label>Receta / Insumos</label>
                        <input
                            type="text"
                            placeholder="Buscar insumo..."
                            className={styles.searchInput}
                            onChange={(e) => setInsumoSearch(e.target.value)}
                        />
                        <div className={styles.checkboxContainer}>
                            {filteredInsumos.map(insumo => (
                                <div key={insumo.id} className={styles.checkboxItem}>
                                    <input
                                        type="checkbox"
                                        id={`insumo-${insumo.id}`}
                                        checked={receta.hasOwnProperty(insumo.id)}
                                        onChange={() => handleInsumoSelect(insumo.id)}
                                    />
                                    <img 
                                        src={insumo.insumo_imagen || insumo.insumo_imagen_url || 'https://placehold.co/40x40/e1e1e1/777?text=N/A'}
                                        alt={insumo.insumo_nombre}
                                        className={styles.itemImage}
                                    />
                                    <label htmlFor={`insumo-${insumo.id}`} className={styles.itemLabel}>
                                        <span>{insumo.insumo_nombre}</span>
                                        <span className={styles.itemUnit}>({insumo.insumo_unidad})</span>
                                    </label>
                                    {receta.hasOwnProperty(insumo.id) && (
                                        <div className={styles.quantityStepper}>
                                            <button type="button" onClick={() => handleRecetaQuantityStep(insumo.id, -1)}>-</button>
                                            
                                            {/* --- INPUT DE CANTIDAD MODIFICADO --- */}
                                            <input
                                                type="number"
                                                // Step dinámico: enteros para Unidad, decimales para Gramos
                                                step={insumo.insumo_unidad === 'Unidad' ? "1" : "0.001"}
                                                min="0"
                                                placeholder="Cant."
                                                className={styles.quantityInput}
                                                value={receta[insumo.id]}
                                                onChange={(e) => handleRecetaQuantityChange(insumo.id, e.target.value)}
                                            />
                                            {/* ------------------------------------- */}
                                            
                                            <button type="button" onClick={() => handleRecetaQuantityStep(insumo.id, 1)}>+</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`${styles.formGroup} ${styles.switchGroup}`}>
                        <label>Disponible</label>
                        <div>
                            <input id="disponible-switch" name="producto_disponible" checked={formData.producto_disponible} onChange={handleChange} type="checkbox" className={styles.switchInput} />
                            <label htmlFor="disponible-switch" className={styles.switchLabel}></label>
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

export default AddEditProductModal;