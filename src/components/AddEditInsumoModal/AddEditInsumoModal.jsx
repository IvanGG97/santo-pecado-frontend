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
        insumo_imagen_url: '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const isEditMode = Boolean(insumo);

    // Carga las categorías de insumo (esto no cambia)
    useEffect(() => {
        apiClient.get('/inventario/categorias-insumo/')
            .then(res => setCategorias(res.data))
            .catch(err => console.error("Error al cargar categorías", err));
    }, []);

    // --- INICIO DE LA CORRECCIÓN ---

    // Efecto 1: Rellena los datos básicos del insumo (incluyendo la unidad).
    // Se ejecuta solo cuando 'insumo' cambia (en modo edición).
    useEffect(() => {
        if (isEditMode && insumo) {
            setFormData(prev => ({
                ...prev, // Mantiene el estado anterior (por si las categorías cargaron primero)
                insumo_nombre: insumo.insumo_nombre || '',
                // ¡Aquí se rellena la unidad de medida correctamente!
                insumo_unidad: insumo.insumo_unidad || '', 
                insumo_stock: insumo.insumo_stock || '',
                insumo_stock_minimo: insumo.insumo_stock_minimo || '',
                insumo_imagen_url: insumo.insumo_imagen_url || '',
            }));
            setPreviewImage(insumo.insumo_imagen || insumo.insumo_imagen_url);
        }
    }, [insumo, isEditMode]); // Depende solo de 'insumo' y 'isEditMode'

    // Efecto 2: Rellena la categoría.
    // Se ejecuta cuando 'insumo' y 'categorias' están listos.
    useEffect(() => {
        if (isEditMode && insumo && categorias.length > 0) {
            const categoria = categorias.find(c => c.categoria_insumo_nombre === insumo.categoria_insumo);
            if (categoria) {
                setFormData(prev => ({
                    ...prev,
                    categoria_insumo: categoria.id
                }));
            }
        }
    }, [insumo, isEditMode, categorias]); // Este sí depende de las categorías

    // --- FIN DE LA CORRECCIÓN ---

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        let payload;
        let requestFn;
        let config = {}; 

        if (imageFile) {
            payload = new FormData();
            Object.keys(formData).forEach(key => payload.append(key, formData[key]));
            payload.append('insumo_imagen', imageFile);
            payload.set('insumo_imagen_url', ''); 
        } else {
            payload = {
                insumo_nombre: formData.insumo_nombre,
                categoria_insumo: formData.categoria_insumo,
                insumo_unidad: formData.insumo_unidad,
                insumo_stock: formData.insumo_stock,
                insumo_stock_minimo: formData.insumo_stock_minimo,
            };
            
            if (isEditMode && !previewImage) {
                payload.insumo_imagen = null;
                payload.insumo_imagen_url = null;
            } 
            else if (formData.insumo_imagen_url) {
                 payload.insumo_imagen_url = formData.insumo_imagen_url;
            }
            config = { headers: { 'Content-Type': 'application/json' } };
        }
        
        requestFn = isEditMode
            ? () => apiClient.patch(`/inventario/insumos/${insumo.id}/`, payload, config)
            : () => apiClient.post('/inventario/insumos/', payload, config);
        
        try {
            await requestFn();
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
                    
                    {/* --- Campo <select> (como lo tenías antes) --- */}
                    <div className={styles.formGroup}>
                        <label>Unidad de Medida</label>
                        <select 
                            name="insumo_unidad" 
                            value={formData.insumo_unidad} 
                            onChange={handleChange} 
                            className={styles.input} 
                            required
                        >
                            <option value="">-- Seleccionar --</option>
                            <option value="Unidad">Unidad</option>
                            <option value="Gramos">Gramos</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Stock Actual</label>
                        <input name="insumo_stock" value={formData.insumo_stock} onChange={handleChange} type="number" step="0.01" min="0" className={styles.input} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Stock Mínimo</label>
                        <input name="insumo_stock_minimo" value={formData.insumo_stock_minimo} onChange={handleChange} type="number" step="0.01" min="0" className={styles.input} required />
                    </div>

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