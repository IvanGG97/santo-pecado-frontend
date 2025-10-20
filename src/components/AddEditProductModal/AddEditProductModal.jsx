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
    const [previewImage, setPreviewImage] = useState(null); // Para la vista previa
    const isEditMode = Boolean(product);

    useEffect(() => {
        apiClient.get('/inventario/tipos-producto/')
            .then(res => setTiposProducto(res.data))
            .catch(err => console.error("Error al cargar tipos de producto", err));
    }, []);

    useEffect(() => {
        if (isEditMode && tiposProducto.length > 0) {
            const tipo = tiposProducto.find(t => t.tipo_producto_nombre === product.tipo_producto);
            setFormData({
                producto_nombre: product.producto_nombre || '',
                producto_descripcion: product.producto_descripcion || '',
                producto_precio: product.producto_precio || '',
                tipo_producto: tipo ? tipo.id : '',
                producto_imagen_url: product.producto_imagen_url || '',
                producto_disponible: product.producto_disponible,
            });
            // Establecemos la imagen de vista previa inicial
            setPreviewImage(product.producto_imagen || product.producto_imagen_url);
        }
    }, [product, isEditMode, tiposProducto]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            // Creamos una URL local para la vista previa instantánea
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleDeleteImage = () => {
        // Limpiamos la vista previa, el archivo seleccionado y la URL
        setPreviewImage(null);
        setImageFile(null);
        setFormData(prev => ({ ...prev, producto_imagen_url: '' }));
        // Limpiamos el input de archivo por si el usuario quiere volver a seleccionar uno
        const fileInput = document.querySelector('input[name="producto_imagen"]');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const dataToSubmit = new FormData();
        Object.keys(formData).forEach(key => dataToSubmit.append(key, formData[key]));
        
        if (imageFile) {
            dataToSubmit.append('producto_imagen', imageFile);
            dataToSubmit.set('producto_imagen_url', '');
        } else if (!previewImage) {
            // Si no hay vista previa, significa que el usuario borró la imagen
            dataToSubmit.set('producto_imagen', '');
            dataToSubmit.set('producto_imagen_url', '');
        }
        
        try {
            if (isEditMode) {
                await apiClient.patch(`/inventario/productos/${product.id}/`, dataToSubmit);
            } else {
                await apiClient.post('/inventario/productos/', dataToSubmit);
            }
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

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>{isEditMode ? 'Editar' : 'Añadir'} Producto</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Nombre</label>
                        <input name="producto_nombre" value={formData.producto_nombre} onChange={handleChange} className={styles.input} required />
                    </div>
                     <div className={styles.formGroup}>
                        <label>Descripción</label>
                        <input name="producto_descripcion" value={formData.producto_descripcion} onChange={handleChange} className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Precio</label>
                        <input name="producto_precio" value={formData.producto_precio} onChange={handleChange} className={styles.input} type="number" step="0.01" min="0" required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Tipo de Producto</label>
                        <select name="tipo_producto" value={formData.tipo_producto} onChange={handleChange} className={styles.input} required>
                            <option value="">-- Seleccionar --</option>
                            {tiposProducto.map(tipo => ( <option key={tipo.id} value={tipo.id}>{tipo.tipo_producto_nombre}</option> ))}
                        </select>
                    </div>

                    {/* --- SECCIÓN DE IMAGEN MEJORADA --- */}
                    {previewImage && (
                        <div className={styles.imagePreviewContainer}>
                            <label>Imagen Actual</label>
                            <img src={previewImage} alt="Vista previa" className={styles.imagePreview} />
                            <button type="button" onClick={handleDeleteImage} className={styles.deleteImageButton}>
                                Eliminar Imagen
                            </button>
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

