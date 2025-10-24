import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './AddEditInsumoModal.module.css'; // Asegúrate de crear este archivo CSS
import Swal from 'sweetalert2';

const AddEditInsumoModal = ({ insumo, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        insumo_nombre: '',
        categoria_insumo: '',
        insumo_unidad: '',
        insumo_stock: '',
        insumo_stock_minimo: '',
        // insumo_precio_compra: '', // Eliminado
        insumo_imagen_url: '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const isEditMode = Boolean(insumo);

    // Carga las categorías de insumo
    useEffect(() => {
        apiClient.get('/inventario/categorias-insumo/')
            .then(res => setCategorias(res.data))
            .catch(err => console.error("Error al cargar categorías", err));
    }, []);

    // Rellena el formulario si estamos editando
    useEffect(() => {
        if (isEditMode && categorias.length > 0) {
            const categoria = categorias.find(c => c.categoria_insumo_nombre === insumo.categoria_insumo);
            setFormData({
                insumo_nombre: insumo.insumo_nombre || '',
                categoria_insumo: categoria ? categoria.id : '',
                insumo_unidad: insumo.insumo_unidad || '',
                insumo_stock: insumo.insumo_stock || '',
                insumo_stock_minimo: insumo.insumo_stock_minimo || '',
                // insumo_precio_compra: insumo.insumo_precio_compra || '', // Eliminado
                insumo_imagen_url: insumo.insumo_imagen_url || '',
            });
            setPreviewImage(insumo.insumo_imagen || insumo.insumo_imagen_url);
        }
    }, [insumo, isEditMode, categorias]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
        setFormData(prev => ({ ...prev, insumo_imagen_url: '' }));
        const fileInput = document.querySelector('input[name="insumo_imagen"]');
        if (fileInput) fileInput.value = '';
    };

    // --- FUNCIÓN handleSubmit CORREGIDA Y FINAL ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        let payload;
        let requestFn;
        let config = {}; // Configuración por defecto para JSON

        if (imageFile) {
            // Caso 1: Se subió un archivo nuevo. Usamos FormData.
            payload = new FormData();
            Object.keys(formData).forEach(key => payload.append(key, formData[key]));
            payload.append('insumo_imagen', imageFile);
            payload.set('insumo_imagen_url', ''); // Prioridad al archivo

        } else {
            // Caso 2: No se subió archivo nuevo. Usamos JSON.
            // Creamos un payload base excluyendo el precio de compra
            payload = {
                insumo_nombre: formData.insumo_nombre,
                categoria_insumo: formData.categoria_insumo,
                insumo_unidad: formData.insumo_unidad,
                insumo_stock: formData.insumo_stock,
                insumo_stock_minimo: formData.insumo_stock_minimo,
                // insumo_precio_compra: formData.insumo_precio_compra, // Eliminado
            };
            
            // Si estamos editando Y la vista previa se eliminó, enviamos nulls para borrar la imagen.
            if (isEditMode && !previewImage) {
                payload.insumo_imagen = null;
                payload.insumo_imagen_url = null;
            } 
            // Si NO estamos editando O si estamos editando y NO se borró la imagen, 
            // Y SI hay una URL en el estado, la incluimos.
            else if (formData.insumo_imagen_url) {
                 payload.insumo_imagen_url = formData.insumo_imagen_url;
                 // No incluimos 'insumo_imagen' para que el backend (PATCH) no lo toque.
            }
            // Si no entra en ninguna de las condiciones anteriores (ej: creando sin imagen o
            // editando sin tocar la imagen), los campos de imagen simplemente no se envían.

            config = { headers: { 'Content-Type': 'application/json' } };
        }
        
        // Definimos la función de petición (POST o PATCH)
        requestFn = isEditMode
            ? () => apiClient.patch(`/inventario/insumos/${insumo.id}/`, payload, config)
            : () => apiClient.post('/inventario/insumos/', payload, config);
        
        try {
            await requestFn(); // Ejecutamos la petición
            Swal.fire('¡Éxito!', `El insumo ha sido ${isEditMode ? 'actualizado' : 'creado'}.`, 'success');
            onSuccess();
        } catch (error) {
            Swal.fire('Error', `No se pudo ${isEditMode ? 'actualizar' : 'crear'} el insumo.`, 'error');
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
                <h2>{isEditMode ? 'Editar' : 'Añadir'} Insumo</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Nombre</label>
                        <input name="insumo_nombre" value={formData.insumo_nombre} onChange={handleChange} className={styles.input} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Categoría</label>
                        <select name="categoria_insumo" value={formData.categoria_insumo} onChange={handleChange} className={styles.input} required>
                            <option value="">-- Seleccionar --</option>
                            {categorias.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.categoria_insumo_nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Unidad de Medida</label>
                        <input name="insumo_unidad" value={formData.insumo_unidad} onChange={handleChange} className={styles.input} placeholder="Ej: kg, litro, unidad" required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Stock Actual</label>
                        <input name="insumo_stock" value={formData.insumo_stock} onChange={handleChange} type="number" step="0.01" min="0" className={styles.input} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Stock Mínimo</label>
                        <input name="insumo_stock_minimo" value={formData.insumo_stock_minimo} onChange={handleChange} type="number" step="0.01" min="0" className={styles.input} required />
                    </div>
                    
                    {/* Campo de Precio de Compra eliminado del JSX */}

                    {previewImage && (
                        <div className={styles.imagePreviewContainer}>
                            <label>Imagen Actual</label>
                            <img src={previewImage} alt="Vista previa" className={styles.imagePreview} />
                            <button type="button" onClick={handleDeleteImage} className={styles.deleteImageButton}>Eliminar Imagen</button>
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label>Imagen (Subir Archivo)</label>
                        <input name="insumo_imagen" onChange={handleFileChange} className={styles.input} type="file" accept="image/*" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>URL de Imagen (Alternativa)</label>
                        <input name="insumo_imagen_url" value={formData.insumo_imagen_url} onChange={handleChange} className={styles.input} type="text" placeholder="https://ejemplo.com/imagen.jpg" autoComplete="off" />
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

export default AddEditInsumoModal;

