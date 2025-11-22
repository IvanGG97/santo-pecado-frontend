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
    // Nuevo estado para almacenar todos los insumos y verificar duplicados
    const [existingInsumos, setExistingInsumos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const isEditMode = Boolean(insumo);

    // Carga las categorías de insumo y la lista de insumos existentes
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resCategorias, resInsumos] = await Promise.all([
                    apiClient.get('/inventario/categorias-insumo/'),
                    apiClient.get('/inventario/insumos/') 
                ]);
                setCategorias(resCategorias.data);
                setExistingInsumos(resInsumos.data);
            } catch (err) {
                console.error("Error al cargar datos iniciales", err);
            }
        };
        fetchData();
    }, []);

    // Efecto 1: Rellena los datos básicos
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

    // Efecto 2: Rellena la categoría
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

        // --- VALIDACIÓN DE STOCK ---
        if (name === "insumo_stock" || name === "insumo_stock_minimo") {
            if (value === "") {
                setFormData(prev => ({ ...prev, [name]: "" }));
                return;
            }
            
            // 1. Validación de Máximo (existente)
            const numValue = parseFloat(value);
            if (numValue > 50000) {
                return;
            }

            // 2. Validación de Enteros para 'Unidad' (NUEVO)
            if (formData.insumo_unidad === 'Unidad') {
                // Si intenta escribir un punto o coma, no actualizamos el estado
                if (value.includes('.') || value.includes(',')) {
                    return;
                }
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- NUEVO: Formateo al salir del input (onBlur) ---
    const handleStockBlur = (e) => {
        const { name, value } = e.target;
        // Solo aplicamos si es Gramos y hay un valor
        if (formData.insumo_unidad === 'Gramos' && value !== '') {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                // Formatea a 1 decimal (ej: 1000 -> 1000.0)
                setFormData(prev => ({
                    ...prev,
                    [name]: num.toFixed(1) 
                }));
            }
        }
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

    const normalizeString = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!e.target.checkValidity()) {
            e.target.reportValidity();
            Swal.fire('Datos Inválidos', 'Por favor, corrige los errores marcados en el formulario.', 'warning');
            return;
        }

        // --- VALIDACIÓN DE DUPLICADOS ---
        const normalizedNewName = normalizeString(formData.insumo_nombre.trim());
        const isDuplicate = existingInsumos.some(existingInsumo => {
            if (isEditMode && existingInsumo.id === insumo.id) {
                return false;
            }
            const normalizedExistingName = normalizeString(existingInsumo.insumo_nombre);
            return normalizedExistingName === normalizedNewName;
        });

        if (isDuplicate) {
            Swal.fire({
                icon: 'warning',
                title: 'Insumo Duplicado',
                text: 'Este insumo ya existe (o tiene un nombre muy similar). Por favor verifica.',
            });
            return;
        }

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

                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                    <div className={styles.formGroup}>
                        <label>Nombre</label>
                        <input
                            name="insumo_nombre"
                            value={formData.insumo_nombre}
                            onChange={handleChange}
                            className={styles.input}
                            required
                            maxLength={100}
                        />
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
                            // --- NUEVO: onBlur para autocompletar .0 en Gramos ---
                            onBlur={handleStockBlur}
                            type="number"
                            // --- NUEVO: Step dinámico según la unidad ---
                            step={formData.insumo_unidad === 'Unidad' ? "1" : "0.1"}
                            min="0"
                            max="50000"
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
                            // --- NUEVO: onBlur para autocompletar .0 en Gramos ---
                            onBlur={handleStockBlur}
                            type="number"
                            // --- NUEVO: Step dinámico según la unidad ---
                            step={formData.insumo_unidad === 'Unidad' ? "1" : "0.1"}
                            min="0"
                            max="50000"
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