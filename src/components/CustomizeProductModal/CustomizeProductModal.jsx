import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/api';
import styles from './CustomizeProductModal.module.css';
import { Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

// --- Constantes para la lógica ---
const TIPOS_CON_ADEREZOS = ['hamburguesa', 'milanesa', 'lomito'];
const CATEGORIA_ADEREZOS = 'aderezos';

const CustomizeProductModal = ({
    product,
    initialData,
    isPromoItem = false,
    allProducts,
    allTipos,
    onClose,
    onSave,
    insumosStock,
    insumoDemand
}) => {

    // --- ESTADOS ---
    const [insumosBase, setInsumosBase] = useState({});
    const [agregados, setAgregados] = useState({});
    const [listaAgregados, setListaAgregados] = useState([]);

    const [aderezosList, setAderezosList] = useState([]);
    const [aderezosState, setAderezosState] = useState({});
    const [isTargetProduct, setIsTargetProduct] = useState(false);
    const [loadingInsumos, setLoadingInsumos] = useState(true);

    // --- 1. EFECTO DE CARGA DE DATOS ---
    useEffect(() => {
        const fetchInsumoData = async () => {
            setLoadingInsumos(true);
            try {
                const resInsumos = await apiClient.get('/inventario/insumos/');
                const allAderezos = resInsumos.data.filter(
                    ins => ins.categoria_insumo.toLowerCase() === CATEGORIA_ADEREZOS
                );

                if (allAderezos.length > 0) {
                    setAderezosList(allAderezos);
                } else {
                    console.warn("No se encontró ningún insumo con la categoría 'Aderezos'");
                }

            } catch (error) {
                console.error("Error cargando insumos o categorías", error);
            } finally {
                setLoadingInsumos(false);
            }
        };

        fetchInsumoData();
    }, []);

    // --- 2. EFECTO DE INICIALIZACIÓN ---
    useEffect(() => {
        if (loadingInsumos || !product || !allTipos || !allProducts) {
            return;
        }

        // --- Lógica de Aderezos ---
        const tipoProductoNombre = allTipos.find(t => t.id === product.tipo_producto_id)?.tipo_producto_nombre || '';
        // Usamos la corrección .some() para que sea más robusto
        const nombreLower = tipoProductoNombre.toLowerCase();
        const esTarget = TIPOS_CON_ADEREZOS.some(tipo => nombreLower.includes(tipo));
        setIsTargetProduct(esTarget);

        const base = {};
        const aderezos = {};
        const defaultRecipeAderezoIds = new Set();

        if (Array.isArray(product.receta)) {
            product.receta.forEach(item => {
                if (!item || !item.insumo) return;

                const esAderezo = aderezosList.some(ad => ad.id === item.insumo.id);

                if (esTarget && esAderezo) {
                    defaultRecipeAderezoIds.add(item.insumo.id);
                } else {
                    base[item.insumo.id] = { ...item.insumo, checked: true };
                }
            });
        }

        aderezosList.forEach(aderezo => {
            const isInRecipe = defaultRecipeAderezoIds.has(aderezo.id);
            aderezos[aderezo.id] = {
                ...aderezo,
                checked: isInRecipe,
            };
        });

        // --- Lógica de Agregados ---
        const tipoAgregado = allTipos.find(t => t.tipo_producto_nombre === 'Agregados');
        if (tipoAgregado) {
            const agregadosDisponibles = allProducts.filter(p => p.tipo_producto_id === tipoAgregado.id);
            setListaAgregados(agregadosDisponibles);
        }

        // --- LÓGICA DE EDICIÓN (REFACTORIZADA) ---
        // ¡Se elimina toda la lógica de parseo de 'initialData.notas'!
        // Ahora leemos el objeto 'customization' directamente.
        if (initialData && initialData.customization) {

            // Si el objeto existe, lo usamos para sobreescribir el estado por defecto
            if (initialData.customization.base) {
                setInsumosBase(initialData.customization.base);
            } else {
                setInsumosBase(base); // Fallback al estado por defecto
            }

            if (initialData.customization.aderezos) {
                setAderezosState(initialData.customization.aderezos);
            } else {
                setAderezosState(aderezos); // Fallback al estado por defecto
            }

        } else {
            // Si es un item nuevo (no hay initialData) o no tiene 'customization' (formato antiguo)
            // Simplemente seteamos el estado por defecto.
            setInsumosBase(base);
            setAderezosState(aderezos);
        }

        // Pre-cargar agregados (sin cambios)
        const initialAgregados = {};
        if (initialData && Array.isArray(initialData.agregados)) {
            initialData.agregados.forEach(ag => {
                if (ag && (ag.id || ag.producto_id)) {
                    const agId = ag.producto_id || ag.id;
                    const fullAgregado = allProducts.find(p => p.id === agId);

                    if (fullAgregado) {
                        initialAgregados[fullAgregado.id] = { ...fullAgregado, cantidad: ag.cantidad || 1 };
                    }
                }
            });
        }
        setAgregados(initialAgregados);

    }, [product, initialData, allProducts, allTipos, loadingInsumos, aderezosList]);

    // --- Handlers ---
    const handleInsumoToggle = (insumoId) => {
        setInsumosBase(prev => ({
            ...prev,
            [insumoId]: { ...prev[insumoId], checked: !prev[insumoId].checked }
        }));
    };

    const handleAderezoToggle = (aderezoId) => {
        setAderezosState(prev => ({
            ...prev,
            [aderezoId]: { ...prev[aderezoId], checked: !prev[aderezoId].checked }
        }));
    };

    // --- Lógica de Agregados (Con validación de Stock) ---
    const checkStock = useCallback((producto, cantidadAChequear) => {
        const missingInsufficients = [];
        if (!insumosStock || !insumoDemand) return { available: true, missingInsufficients: [] };

        // --- CORRECCIÓN: Comprobar si 'receta' es un array ---
        if (producto && Array.isArray(producto.receta) && producto.receta.length > 0) {
            for (const recetaItem of producto.receta) {
                if (!recetaItem || !recetaItem.insumo) continue;
                const insumoId = recetaItem.insumo.id;
                const insumoNombre = recetaItem.insumo.insumo_nombre;
                const cantidadRequeridaPorUnidad = parseFloat(recetaItem.producto_insumo_cantidad);
                const insumoEnStock = insumosStock.find(i => i.id === insumoId);
                const stockTotal = parseFloat(insumoEnStock?.insumo_stock || 0);
                const demandaActual = insumoDemand.get(insumoId) || 0;

                let demandaExcluida = 0;
                if (initialData && (initialData.producto_id === producto.id || initialData.id === producto.id)) {
                    const productoEditado = allProducts.find(p => p.id === initialData.producto_id);
                    // --- CORRECCIÓN: Comprobar si 'receta' es un array ---
                    const recetaItemEditado = Array.isArray(productoEditado?.receta) ? productoEditado.receta.find(r => r.insumo.id === insumoId) : null;

                    if (recetaItemEditado) {
                        demandaExcluida = (parseFloat(recetaItemEditado.producto_insumo_cantidad) || 0) * (initialData.cantidad || 0);
                    }
                }

                const stockRestante = stockTotal - (demandaActual - demandaExcluida);

                if (stockRestante < (cantidadRequeridaPorUnidad * cantidadAChequear)) {
                    missingInsufficients.push(insumoNombre);
                }
            }
        }
        return { available: missingInsufficients.length === 0, missingInsufficients: [] };
    }, [insumosStock, insumoDemand, initialData, allProducts]);


    const handleAgregadoClick = (agregado) => {
        const stockCheck = checkStock(agregado, 1);
        if (!stockCheck.available) {
            Swal.fire(
                'Insumo/s insuficiente/s',
                `No se puede añadir "${agregado.producto_nombre}" porque falta: ${stockCheck.missingInsufficients.join(', ')}`,
                'error'
            );
            return;
        }

        setAgregados(prev => {
            const newAgregados = { ...prev };
            if (newAgregados[agregado.id]) {
                delete newAgregados[agregado.id];
            } else {
                newAgregados[agregado.id] = { ...agregado, cantidad: 1 };
            }
            return newAgregados;
        });
    };

    const handleAgregadoQuantityStep = (agregadoId, amount) => {
        setAgregados(prev => {
            const currentAgregado = prev[agregadoId];
            if (!currentAgregado) return prev;

            const currentQty = Number(currentAgregado.cantidad) || 0;
            const newQuantity = currentQty + amount;

            if (amount > 0) {
                const stockCheck = checkStock(currentAgregado, amount);
                if (!stockCheck.available) {
                    Swal.fire('Stock Insuficiente', `No se puede añadir más "${currentAgregado.producto_nombre}". Falta: ${stockCheck.missingInsufficients.join(', ')}`, 'warning');
                    return prev;
                }
            }

            if (newQuantity <= 0) {
                const { [agregadoId]: _, ...rest } = prev;
                return rest;
            } else {
                return {
                    ...prev,
                    [agregadoId]: { ...currentAgregado, cantidad: newQuantity }
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
                const currentQty = Number(newAgregados[agregadoId].cantidad) || 0;

                const stockCheck = checkStock(newAgregados[agregadoId], currentQty);

                if (!stockCheck.available) {
                    Swal.fire('Stock Insuficiente', `Cantidad ajustada. No hay stock para ${currentQty} unidades. Falta: ${stockCheck.missingInsufficients.join(', ')}`, 'warning');
                    delete newAgregados[agregadoId];
                } else if (currentQty <= 0) {
                    delete newAgregados[agregadoId];
                } else {
                    newAgregados[agregadoId].cantidad = currentQty;
                }
            }
            return newAgregados;
        });
    };
    // --- FIN LÓGICA AGREGADOS ---


    // --- 3. handleSave (MODIFICADO para nuevo formato de notas) ---
    const handleSave = () => {
        
        // --- Lógica de Agregados y Precio (sin cambios) ---
        let agregadosList = [];
        if (!isPromoItem) {
            agregadosList = Object.values(agregados)
                .map(ag => ({ ...ag, cantidad: Number(ag.cantidad) || 0 }))
                .filter(ag => ag.cantidad > 0);
        }

        let precioTotalCalculado = (product && product.producto_precio) ? parseFloat(product.producto_precio) : 0; 
        if (!isPromoItem) {
            agregadosList.forEach(agregado => {
                precioTotalCalculado += (parseFloat(agregado.producto_precio) * agregado.cantidad);
            });
        }

        // --- CAMBIO ---
        // Ya no generamos un string de 'notas' aquí.
        // Enviamos los objetos de estado 'insumosBase' y 'aderezosState' directamente.
        
        onSave({
            product: product, 
            agregados: agregadosList, 
            precioTotal: precioTotalCalculado,
            
            // --- NUEVO CAMPO ---
            // Pasamos el estado de personalización como un objeto
            customization: {
                base: insumosBase,
                aderezos: aderezosState,
                // Guardamos si es un 'target product' para que la página sepa
                // si debe generar la sección "Aderezos" en las notas.
                isTargetProduct: isTargetProduct 
            }
        });
    };


    // --- RENDERIZADO ---
    if (loadingInsumos || !product) {
        return (
            <div className={styles.modalBackdrop}>
                <div className={styles.modalContent} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className={styles.spinner} />
                    <p>Cargando personalización...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>Personalizar: {product.producto_nombre || 'Producto'}</h2>

                {/* --- 4. JSX MODIFICADO --- */}
                <div className={`${styles.columns} ${isPromoItem ? styles.singleColumn : ''} ${isTargetProduct ? styles.threeColumns : ''}`}>

                    {/* Columna 1: Quitar Insumos Base */}
                    <div className={styles.column}>
                        <h3>Quitar Ingredientes</h3>
                        <div className={styles.listContainer}>
                            {Object.values(insumosBase).length > 0 ? (
                                Object.values(insumosBase).map(insumo => (
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
                                    ) : null
                                ))
                            ) : (
                                <p className={styles.noItems}>Este producto no tiene ingredientes base para quitar.</p>
                            )}
                        </div>
                    </div>

                    {/* --- NUEVA COLUMNA: Aderezos --- */}
                    {isTargetProduct && (
                        <div className={styles.column}>
                            <h3>Aderezos</h3>
                            <div className={styles.listContainer}>
                                {aderezosList.length > 0 ? (
                                    Object.values(aderezosState).map(aderezo => (
                                        <div key={aderezo.id} className={styles.checkItem}>
                                            <input
                                                type="checkbox"
                                                id={`aderezo-${aderezo.id}`}
                                                checked={aderezo.checked}
                                                onChange={() => handleAderezoToggle(aderezo.id)}
                                                disabled={isPromoItem}
                                            />
                                            <label htmlFor={`aderezo-${aderezo.id}`}>{aderezo.insumo_nombre}</label>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.noItems}>No hay aderezos disponibles.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Columna 3: Añadir Agregados (Solo si NO es promo) */}
                    {!isPromoItem && (
                        <div className={styles.column}>
                            <h3>Añadir Agregados</h3>
                            <div className={styles.listContainer}>
                                {listaAgregados.length > 0 ? (
                                    listaAgregados.map(agregado => (
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
                                        ) : null
                                    ))
                                ) : (
                                    <p className={styles.noItems}>No hay agregados disponibles.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {/* --- FIN JSX MODIFICADO --- */}

                <div className={styles.buttons}>
                    <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                    <button onClick={handleSave} className={styles.saveButton}>Actualizar Pedido</button>
                </div>
            </div>
        </div>
    );
};

export default CustomizeProductModal;