import React, { useState, useEffect } from 'react';

import styles from './CustomizeProductModal.module.css';


const CustomizeProductModal = ({ product, initialData, isPromoItem = false, allProducts, allTipos, onClose, onSave }) => {

    const [insumosBase, setInsumosBase] = useState({});
    const [agregados, setAgregados] = useState({});
    const [listaAgregados, setListaAgregados] = useState([]);

    useEffect(() => {
        // 1. Inicializa los insumos base desde la receta del producto
        const base = {};

        if (product && product.receta) { // Verificar que product y product.receta existan

            product.receta.forEach(item => {

                if (item && item.insumo) { // Verificar que item e item.insumo existan

                    base[item.insumo.id] = { ...item.insumo, checked: true };
                }
            });
        }


        // 2. Busca los agregados disponibles

        const tipoAgregado = allTipos.find(t => t.tipo_producto_nombre === 'Agregados');
        if (tipoAgregado && allProducts) { // Verificar allProducts

            const agregadosDisponibles = allProducts.filter(p => p.tipo_producto_id === tipoAgregado.id);
            setListaAgregados(agregadosDisponibles);
        }

        // 3. Si estamos editando (initialData existe), pre-cargamos el estado
        if (initialData) {
            // Pre-cargamos los insumos base (ej: "Sin lechuga")

            if (initialData.notas) {

                const notasSplit = initialData.notas.includes(' | ') ? initialData.notas.split(' | ') : initialData.notas.split(',');
                const notasPersonalizacion = notasSplit.find(n => !n.trim().startsWith('Parte de:'))?.trim() || '';
                if (notasPersonalizacion) {
                    const notasSin = notasPersonalizacion.split(', ').map(n => n.trim().replace('Sin ', ''));
                    Object.keys(base).forEach(id => {

                        if (notasSin.includes(base[id].insumo_nombre)) {

                            base[id].checked = false;
                        }
                    });
                }
            }
            // Pre-cargamos los agregados del ticket item si existen

            if (initialData.agregados && Array.isArray(initialData.agregados)) {
                const initialAgregados = {};

                initialData.agregados.forEach(ag => {

                    if (ag && ag.id) { // Verificar ag y ag.id

                        initialAgregados[ag.id] = { ...ag, cantidad: ag.cantidad || 1 }; // Asegurar cantidad
                    }
                });
                setAgregados(initialAgregados);
            }
        } else {
            // Si no estamos editando, asegúrate de que agregados esté vacío
            setAgregados({});
        }

        setInsumosBase(base);
        // Dependencias clave para re-calcular si el producto o los datos iniciales cambian
    }, [product, initialData, allProducts, allTipos]);



    const handleInsumoToggle = (insumoId) => {
        setInsumosBase(prev => ({
            ...prev,
            [insumoId]: { ...prev[insumoId], checked: !prev[insumoId].checked }
        }));
    };

    // --- LÓGICA DE AGREGADOS ---


    const handleAgregadoClick = (agregado) => {
        setAgregados(prev => {
            const newAgregados = { ...prev };

            if (newAgregados[agregado.id]) {

                delete newAgregados[agregado.id];
            } else {

                newAgregados[agregado.id] = { ...agregado, cantidad: 1 }; // Siempre inicia en 1 al seleccionar
            }
            return newAgregados;
        });
    };


    const handleAgregadoQuantityStep = (agregadoId, amount) => {
        setAgregados(prev => {
            const currentAgregado = prev[agregadoId];
            if (!currentAgregado) {
                return prev;
            }
            const currentQty = Number(currentAgregado.cantidad) || 0;
            const newQuantity = currentQty + amount;

            if (newQuantity <= 0) {
                const { [agregadoId]: _, ...rest } = prev;
                return rest;
            } else {
                return {
                    ...prev,
                    [agregadoId]: {
                        ...currentAgregado,
                        cantidad: newQuantity
                    }
                };
            }
        });
    };


    const handleAgregadoQuantityInput = (agregadoId, value) => {
        setAgregados(prev => {
            const newAgregados = { ...prev };
            const currentAgregado = newAgregados[agregadoId];
            if (!currentAgregado) return prev;
            if (value === '') {
                newAgregados[agregadoId].cantidad = '';
                return newAgregados;
            }
            if (/^\d*\.?\d*$/.test(value) && Number(value) >= 0) {
                newAgregados[agregadoId].cantidad = value;
            }
            return newAgregados;
        });
    };


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
        // Genera las notas de insumos quitados
        const notas = Object.values(insumosBase)

            .filter(insumo => !insumo.checked)

            .map(insumo => `Sin ${insumo.insumo_nombre}`)
            .join(', '); // Une con coma y espacio

        // Prepara la lista de agregados finales (solo si no es promo)
        let agregadosList = [];
        if (!isPromoItem) {
            agregadosList = Object.values(agregados)
                // Asegura que cantidad sea número y filtra los <= 0
                .map(ag => ({ ...ag, cantidad: Number(ag.cantidad) || 0 }))

                .filter(ag => ag.cantidad > 0);
        }

        // Calcula el precio total (considerando agregados solo si no es promo)

        let precioTotalCalculado = (product && product.producto_precio) ? parseFloat(product.producto_precio) : 0; // Precio base del producto
        if (!isPromoItem) {
            agregadosList.forEach(agregado => {

                precioTotalCalculado += (parseFloat(agregado.producto_precio) * agregado.cantidad);
            });
        }

        onSave({

            product: product, // El producto original que se está personalizando
            agregados: agregadosList, // La lista filtrada y validada de agregados
            notas: notas, // String con los insumos quitados
            precioTotal: precioTotalCalculado // Pasamos el precio total calculado
        });
    };

    // Verificar si product existe antes de intentar acceder a sus propiedades

    if (!product) {
        // Puedes mostrar un mensaje de carga o error, o simplemente no renderizar nada
        return <div className={styles.modalBackdrop}><div className={styles.modalContent}><p>Cargando producto...</p></div></div>;
    }


    return (

        <div className={styles.modalBackdrop}>

            <div className={styles.modalContent}>

                <button onClick={onClose} className={styles.closeButton}>&times;</button>

                <h2>Personalizar: {product.producto_nombre || 'Producto'}</h2>


                <div className={`${styles.columns} ${isPromoItem ? styles.singleColumn : ''}`}>

                    {/* Columna 1: Quitar Insumos */}

                    <div className={styles.column}>
                        <h3>Quitar Ingredientes</h3>

                        <div className={styles.listContainer}>
                            {/* Mapeo de insumos base */}
                            {Object.values(insumosBase).map(insumo => (
                                // Asegurarse que insumo y su id existan
                                insumo && insumo.id ? (

                                    <div key={insumo.id} className={styles.checkItem}>
                                        <input
                                            type="checkbox"
                                            id={`insumo-${insumo.id}`}

                                            checked={insumo.checked}
                                            onChange={() => handleInsumoToggle(insumo.id)}
                                        />

                                        <label htmlFor={`insumo-${insumo.id}`}>{insumo.insumo_nombre || 'Ingrediente sin nombre'}</label>
                                    </div>
                                ) : null // No renderizar si falta el insumo o id
                            ))}
                        </div>
                    </div>

                    {/* Columna 2: Añadir Agregados (Solo si NO es promo) */}
                    {!isPromoItem && (

                        <div className={styles.column}>
                            <h3>Añadir Agregados</h3>

                            <div className={styles.listContainer}>
                                {listaAgregados.length > 0 ? (

                                    listaAgregados.map(agregado => (
                                        // Asegurarse que agregado y su id existan
                                        agregado && agregado.id ? (

                                            <div key={agregado.id} className={styles.checkItem}>
                                                <input
                                                    type="checkbox"
                                                    id={`agregado-${agregado.id}`}

                                                    checked={agregados.hasOwnProperty(agregado.id)}
                                                    onChange={() => handleAgregadoClick(agregado)}
                                                />

                                                <label htmlFor={`agregado-${agregado.id}`} className={styles.itemLabel}>

                                                    <span>{agregado.producto_nombre || 'Agregado sin nombre'}</span>

                                                    <span className={styles.itemPrice}>${agregado.producto_precio || '0.00'}</span>
                                                </label>

                                                {/* Stepper aparece si el agregado está seleccionado */}

                                                {agregados.hasOwnProperty(agregado.id) && (

                                                    <div className={styles.quantityStepper}>

                                                        <button type="button" onClick={() => handleAgregadoQuantityStep(agregado.id, -1)}>-</button>
                                                        <input
                                                            type="text"

                                                            className={styles.quantityInput}

                                                            value={agregados[agregado.id]?.cantidad ?? ''}
                                                            onChange={(e) => handleAgregadoQuantityInput(agregado.id, e.target.value)}
                                                            onBlur={() => handleQuantityInputBlur(agregado.id)}
                                                        />

                                                        <button type="button" onClick={() => handleAgregadoQuantityStep(agregado.id, 1)}>+</button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null // No renderizar si falta agregado o id
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

