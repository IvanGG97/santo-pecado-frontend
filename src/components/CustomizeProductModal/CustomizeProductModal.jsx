import React, { useState, useEffect } from 'react';
import styles from './CustomizeProductModal.module.css';

const CustomizeProductModal = ({ product, initialData, isPromoItem = false, allProducts, allTipos, onClose, onSave }) => {
    
    const [insumosBase, setInsumosBase] = useState({});
    const [agregados, setAgregados] = useState({});
    const [listaAgregados, setListaAgregados] = useState([]);

    useEffect(() => {
        // 1. Inicializa los insumos base desde la receta del producto
        const base = {};
        product.receta.forEach(item => {
            base[item.insumo.id] = { ...item.insumo, checked: true };
        });

        // 2. Busca los agregados disponibles
        const tipoAgregado = allTipos.find(t => t.tipo_producto_nombre === 'Agregados');
        if (tipoAgregado) {
            const agregadosDisponibles = allProducts.filter(p => p.tipo_producto_id === tipoAgregado.id);
            setListaAgregados(agregadosDisponibles);
        }

        // 3. Si estamos editando (initialData existe), pre-cargamos el estado
        if (initialData) {
            // Pre-cargamos los insumos base (ej: "Sin lechuga")
            if (initialData.notas) {
                const notasSin = initialData.notas.split(', ').map(n => n.replace('Sin ', ''));
                Object.keys(base).forEach(id => {
                    if (notasSin.includes(base[id].insumo_nombre)) {
                        base[id].checked = false;
                    }
                });
            }
            // Pre-cargamos los agregados
            if (initialData.agregados) {
                const initialAgregados = {};
                initialData.agregados.forEach(ag => {
                    initialAgregados[ag.id] = { ...ag, cantidad: ag.cantidad };
                });
                setAgregados(initialAgregados);
            }
        }
        
        setInsumosBase(base);
    }, [product, initialData, allProducts, allTipos]);


    const handleInsumoToggle = (insumoId) => {
        setInsumosBase(prev => ({
            ...prev,
            [insumoId]: { ...prev[insumoId], checked: !prev[insumoId].checked }
        }));
    };

    // --- LÓGICA DE AGREGADOS (FORZANDO NÚMEROS) ---

    const handleAgregadoClick = (agregado) => {
        setAgregados(prev => {
            const newAgregados = { ...prev };
            // Si el agregado ya existe en el estado, lo eliminamos (deseleccionar).
            if (newAgregados[agregado.id]) {
                delete newAgregados[agregado.id];
            } else {
                // Si no existe, lo añadimos con cantidad 1 (seleccionar).
                newAgregados[agregado.id] = { ...agregado, cantidad: 1 };
            }
            return newAgregados;
        });
    };

    const handleAgregadoQuantityStep = (agregadoId, amount) => {
        setAgregados(prev => {
            const newAgregados = { ...prev };
            if (newAgregados[agregadoId]) {
                const currentQty = Number(newAgregados[agregadoId].cantidad) || 0;
                const newQuantity = currentQty + amount;
                
                if (newQuantity <= 0) {
                    delete newAgregados[agregadoId];
                } else {
                    newAgregados[agregadoId].cantidad = newQuantity;
                }
            }
            return newAgregados;
        });
    };

    const handleAgregadoQuantityInput = (agregadoId, value) => {
        setAgregados(prev => {
            const newAgregados = { ...prev };
            // Obtenemos el objeto actual
            const currentAgregado = newAgregados[agregadoId];
            if (!currentAgregado) return prev; // No hacer nada si no existe

            // Si el campo está vacío, permitimos que el estado sea un string vacío
            if (value === '') {
                newAgregados[agregadoId].cantidad = '';
                return newAgregados;
            }
            
            // Regex para permitir números enteros o decimales (ej: "1", "0.5", "1.")
            if (/^\d*\.?\d*$/.test(value)) {
                if (Number(value) < 0) return newAgregados; // No permite negativos
                newAgregados[agregadoId].cantidad = value; // Almacena como string para permitir "0."
            }
            
            return newAgregados;
        });
    };
    
    // Al salir del input (onBlur), limpiamos y validamos el número
    const handleQuantityInputBlur = (agregadoId) => {
         setAgregados(prev => {
            const newAgregados = { ...prev };
            if (newAgregados[agregadoId]) {
                const newQuantity = Number(newAgregados[agregadoId].cantidad) || 0;
                if (newQuantity <= 0) {
                    delete newAgregados[agregadoId];
                } else {
                    newAgregados[agregadoId].cantidad = newQuantity;
                }
            }
            return newAgregados;
         });
    };

    const handleSave = () => {
        const notas = Object.values(insumosBase)
            .filter(insumo => !insumo.checked)
            .map(insumo => `Sin ${insumo.insumo_nombre}`)
            .join(', ');

        let precioTotal = parseFloat(product.producto_precio);
        
        // Solo calculamos el precio de los agregados si NO es un item de promoción
        let agregadosList = [];
        if (!isPromoItem) {
            agregadosList = Object.values(agregados)
                .map(ag => ({ ...ag, cantidad: Number(ag.cantidad) || 0 }))
                .filter(ag => ag.cantidad > 0); 
                
            agregadosList.forEach(agregado => {
                precioTotal += parseFloat(agregado.producto_precio) * agregado.cantidad;
            });
        }

        onSave({
            product: product,
            agregados: agregadosList,
            notas: notas,
            precioTotal: precioTotal
        });
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>Personalizar: {product.producto_nombre}</h2>
                
                {/* --- LAYOUT DE COLUMNAS ACTUALIZADO --- */}
                <div className={`${styles.columns} ${isPromoItem ? styles.singleColumn : ''}`}>
                    
                    {/* Columna 1: Quitar Insumos (Siempre visible) */}
                    <div className={styles.column}>
                        <h3>Quitar Ingredientes</h3>
                        <div className={styles.listContainer}>
                            {Object.values(insumosBase).map(insumo => (
                                <div key={insumo.id} className={styles.checkItem}>
                                    <input 
                                        type="checkbox" 
                                        id={`insumo-${insumo.id}`} 
                                        checked={insumo.checked}
                                        onChange={() => handleInsumoToggle(insumo.id)}
                                    />
                                    <label htmlFor={`insumo-${insumo.id}`}>{insumo.insumo_nombre}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Columna 2: Añadir Agregados (Solo si NO es un item de promoción) */}
                    {!isPromoItem && (
                        <div className={styles.column}>
                            <h3>Añadir Agregados</h3>
                            <div className={styles.listContainer}>
                                {listaAgregados.length > 0 ? (
                                    listaAgregados.map(agregado => (
                                        <div key={agregado.id} className={styles.checkItem}>
                                            <input 
                                                type="checkbox" 
                                                id={`agregado-${agregado.id}`} 
                                                checked={agregados.hasOwnProperty(agregado.id)}
                                                onChange={() => handleAgregadoClick(agregado)}
                                            />
                                            <label htmlFor={`agregado-${agregado.id}`} className={styles.itemLabel}>
                                                <span>{agregado.producto_nombre}</span>
                                                <span className={styles.itemPrice}>${agregado.producto_precio}</span>
                                            </label>
                                            
                                            {agregados.hasOwnProperty(agregado.id) && (
                                                <div className={styles.quantityStepper}>
                                                    <button type="button" onClick={() => handleAgregadoQuantityStep(agregado.id, -1)}>-</button>
                                                    <input
                                                        type="text"
                                                        className={styles.quantityInput}
                                                        value={agregados[agregado.id].cantidad}
                                                        onChange={(e) => handleAgregadoQuantityInput(agregado.id, e.target.value)}
                                                        onBlur={() => handleQuantityInputBlur(agregado.id)}
                                                    />
                                                    <button type="button" onClick={() => handleAgregadoQuantityStep(agregado.id, 1)}>+</button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.noAgregados}>No hay agregados disponibles.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.buttons}>
                    <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                    <button onClick={handleSave} className={styles.saveButton}>Actualizar Pedido</button>
                </div>
            </div>
        </div>
    );
};

export default CustomizeProductModal;
