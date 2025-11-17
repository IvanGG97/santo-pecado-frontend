import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import styles from './AddEditInsumoModal.module.css';
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

    // Carga las categorías de insumo
    useEffect(() => {
        apiClient.get('/inventario/categorias-insumo/')
            .then(res => setCategorias(res.data))
            .catch(err => console.error("Error al cargar categorías", err));
    }, []);

    // Efecto 1: Rellena los datos básicos (Corregido)
    useEffect(() => {
        if (isEditMode && insumo) {
            setFormData(prev => ({
                ...prev,
                insumo_nombre: insumo.insumo_nombre || '',
                insumo_unidad: insumo.insumo_unidad || '',
                insumo_stock: insumo.insumo_stock || '',
                insumo_stock_minimo: insumo.insumo_stock_minimo || '',
                insumo_imagen_url: insumo.insumo_imagen_url || '',
            }));
            setPreviewImage(insumo.insumo_imagen || insumo.insumo_imagen_url);
        }
    }, [insumo, isEditMode]);

    // Efecto 2: Rellena la categoría (Corregido)
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
    }, [insumo, isEditMode, categorias]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // --- VALIDACIÓN EN TIEMPO REAL (Para evitar valores > 50000) ---
        // (Aunque el navegador lo previene, esto evita que el estado se actualice)
        if (name === "insumo_stock" || name === "insumo_stock_minimo") {
            if (value === "") {
                setFormData(prev => ({ ...prev, [name]: "" }));
                return;
            }
            const numValue = parseFloat(value);
            if (numValue > 50000) {
                // Si el valor excede 50000, no actualices el estado
                return;
            }
        }

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

        // --- RECOMENDACIÓN DE VALIDACIÓN (NUEVO) ---
        // Verifica todos los campos (max, min, required) antes de enviar
        if (!e.target.checkValidity()) {
            // Fuerza al navegador a mostrar los mensajes de error
            e.target.reportValidity();
            Swal.fire('Datos Inválidos', 'Por favor, corrige los errores marcados en el formulario.', 'warning');
            return; // Detiene el envío
        }
        // --- FIN DE RECOMENDACIÓN ---

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
            payload = { ...formData };

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

                {/* Añadimos 'noValidate' para que nuestra validación personalizada en handleSubmit funcione */}
                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                    <div className={styles.formGroup}>
                        <label>Nombre</label>
                        <input
                            name="insumo_nombre"
                            value={formData.insumo_nombre}
                            onChange={handleChange}
                            className={styles.input}
                            required
                            maxLength={100} // --- NUEVO (Goal 1) ---
                        />
                        {/* --- NUEVO: Contador de Caracteres (Goal 2) --- */}
                        <small className={styles.charCounter}>
                            {formData.insumo_nombre.length} / 100
                        </small>
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
                        <input
                            name="insumo_stock"
                            value={formData.insumo_stock}
                            onChange={handleChange}
                            type="number"
                            step="0.01"
                            min="0"
                            max="50000" // --- NUEVO (Goal 3) ---
                            className={styles.input}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Stock Mínimo</label>
                        <input
                            name="insumo_stock_minimo"
                            value={formData.insumo_stock_minimo}
                            onChange={handleChange}
                            type="number"
                            step="0.01"
                            min="0"
                            max="50000" // --- NUEVO (Goal 4) ---
                            className={styles.input}
                            required
                        />
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