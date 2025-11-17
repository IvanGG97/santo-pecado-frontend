import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import styles from './PedidosPage.module.css';
import Swal from 'sweetalert2';
import CustomizeProductModal from '../../components/CustomizeProductModal/CustomizeProductModal';
import SelectClienteModal from '../../components/SelectClienteModal/SelectClienteModal';

const PedidosPage = () => {
    const [productos, setProductos] = useState([]);
    const [promociones, setPromociones] = useState([]);
    const [tiposProducto, setTiposProducto] = useState([]);
    const [insumosStock, setInsumosStock] = useState([]);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('productos');
    const [selectedTipo, setSelectedTipo] = useState('todos');
    const [agregadosTipoId, setAgregadosTipoId] = useState(null);

    const [ticket, setTicket] = useState([]);
    const [ticketTotal, setTicketTotal] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToCustomize, setProductToCustomize] = useState(null);

    const [editingTicketItem, setEditingTicketItem] = useState(null);
    const [isEditingPromoItem, setIsEditingPromoItem] = useState(false);

    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);

    const [isVerifyingCaja, setIsVerifyingCaja] = useState(true);
    const navigate = useNavigate();

    // --- useEffect para verificar la caja (se ejecuta primero) ---
    useEffect(() => {
        const checkCajaStatus = async () => {
            try {
                const res = await apiClient.get('/caja/estado/');
                if (res.data && res.data.caja_estado === true) {
                    setIsVerifyingCaja(false); // Permite la carga
                } else {
                    // Si la caja está cerrada
                    Swal.fire({
                        title: 'Caja Cerrada',
                        text: 'Para entrar a esta seccion primero debes abrir una caja',
                        icon: 'warning',
                        confirmButtonText: 'Ir a Cajas',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                    }).then((result) => {
                        if (result.isConfirmed) {
                            navigate('/cajas'); // Redirige a Cajas
                        }
                    });
                }
            } catch (err) {
                console.error("Error al verificar estado de caja:", err);
                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'No se pudo verificar el estado de la caja. Intente más tarde.',
                    icon: 'error',
                    confirmButtonText: 'Ir a Inicio',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                }).then(() => {
                    navigate('/inicio'); // Redirige a Inicio
                });
            }
        };

        checkCajaStatus();
    }, [navigate]);

    // --- useEffect para cargar datos (depende de la verificación) ---
    useEffect(() => {
        if (isVerifyingCaja) {
            return; // No hacer nada si aún está verificando
        }

        const loadPageData = async () => {
            try {
                setLoading(true);
                const [resProductos, resPromos, resTipos, resInsumos] = await Promise.all([
                    apiClient.get('/inventario/productos/'),
                    apiClient.get('/promocion/promociones/'),
                    apiClient.get('/inventario/tipos-producto/'),
                    apiClient.get('/inventario/insumos/')
                ]);

                setInsumosStock(resInsumos.data);
                setProductos(resProductos.data.filter(p => p.producto_disponible));
                setPromociones(resPromos.data.filter(p => p.promocion_disponible && p.promocion_stock > 0));

                const tiposData = resTipos.data;
                setTiposProducto([{ id: 'todos', tipo_producto_nombre: 'Todos' }, ...tiposData]);

                const tipoAgregado = tiposData.find(t => t.tipo_producto_nombre === 'Agregados');
                if (tipoAgregado) {
                    setAgregadosTipoId(tipoAgregado.id);
                } else {
                    console.warn("No se encontró el Tipo de Producto 'Agregados'. El filtro puede no funcionar como se espera.");
                }

            } catch (error) {
                Swal.fire('Error', 'No se pudieron cargar los datos del menú o insumos.', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadPageData();

    }, [isVerifyingCaja]);

    // Calcular el total
    useEffect(() => {
        const total = ticket.reduce((sum, item) => sum + (Number(item.precioUnitario) * Number(item.cantidad)), 0);
        setTicketTotal(total);
    }, [ticket]);

    // Filtrar productos para la grilla
    const productosFiltrados = useMemo(() => {
        return productos.filter(p => {
            const tipoCoincide = selectedTipo === 'todos' || p.tipo_producto_id === selectedTipo;
            const esAgregado = p.tipo_producto_id === agregadosTipoId;
            const mostrarAgregado = esAgregado && selectedTipo === agregadosTipoId;
            const noEsAgregadoVisibleNormalmente = !esAgregado;
            return tipoCoincide && (noEsAgregadoVisibleNormalmente || mostrarAgregado);
        });
    }, [productos, selectedTipo, agregadosTipoId]);

    const generateDisplayNotes = (customization, agregados) => {
        const notasPartes = [];

        if (customization && customization.base) {
            const notasConBase = Object.values(customization.base)
                .filter(insumo => insumo.checked)
                .map(insumo => insumo.insumo_nombre)
                .join(', ');

            const notasSinBase = Object.values(customization.base)
                .filter(insumo => !insumo.checked)
                .map(insumo => insumo.insumo_nombre);

            if (notasConBase) notasPartes.push(`Con: ${notasConBase}`);
            if (notasSinBase.length > 0) notasPartes.push(`Sin: ${notasSinBase.join(', ')}`);
        }

        if (customization && customization.isTargetProduct && customization.aderezos) {
            const notasConAderezos = Object.values(customization.aderezos)
                .filter(aderezo => aderezo.checked)
                .map(aderezo => aderezo.insumo_nombre)
                .join(', ');

            if (notasConAderezos) notasPartes.push(`Aderezos: ${notasConAderezos}`);
        }

        return notasPartes.join(' | ');
    };


    // Hook useMemo para calcular la demanda de insumos en el ticket actual
    const insumoDemand = useMemo(() => {
        const demandMap = new Map(); // <insumoId, totalUsado>

        if (!productos || productos.length === 0) {
            return demandMap;
        }

        for (const ticketItem of ticket) {
            const productInfo = productos.find(p => p.id === ticketItem.producto_id);
            
            if (productInfo && Array.isArray(productInfo.receta)) {
                for (const recetaItem of productInfo.receta) {
                    if (!recetaItem || !recetaItem.insumo) continue;
                    const insumoId = recetaItem.insumo.id;
                    const cantidadRequerida = parseFloat(recetaItem.producto_insumo_cantidad);

                    const demandaActual = demandMap.get(insumoId) || 0;

                    demandMap.set(insumoId, demandaActual + (cantidadRequerida * ticketItem.cantidad));
                }
            }
        }
        return demandMap;
    }, [ticket, productos]);


    // --- Verificador de Stock ---
    const checkStock = (producto, cantidadAChequear) => {
        const missingInsufficients = [];

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
                if (editingTicketItem && (editingTicketItem.producto_id === producto.id || editingTicketItem.id === producto.id)) {
                    const productoEditado = productos.find(p => p.id === editingTicketItem.producto_id);
                    const recetaItemEditado = Array.isArray(productoEditado?.receta) ? productoEditado.receta.find(r => r.insumo.id === insumoId) : null;

                    if (recetaItemEditado) {
                        demandaExcluida = (parseFloat(recetaItemEditado.producto_insumo_cantidad) || 0) * (editingTicketItem.cantidad || 0);
                    }
                }

                const stockRestante = stockTotal - (demandaActual - demandaExcluida);

                if (stockRestante < (cantidadRequeridaPorUnidad * cantidadAChequear)) {
                    missingInsufficients.push(insumoNombre);
                }
            }
        }

        if (missingInsufficients.length > 0) {
            return { available: false, missingInsufficients };
        }

        return { available: true, missingInsufficients: [] };
    };


    // --- Lógica del Pedido ---
    const createTicketItem = (item, cantidad, precio, notas, agregados = [], imagen = null, groupId = null, uniqueSubItemIdPart = null, customization = null) => {
        const finalId = uniqueSubItemIdPart 
            ? `${groupId}-${uniqueSubItemIdPart}`
            : (groupId ? `${item.id || 'agregado'}-${groupId}-${Date.now()}` : `${item.id}-${Date.now()}`); 
        
        return {
            id: finalId,
            producto_id: item.producto_id === null ? null : (item.producto_id || item.id),
            nombre: item.producto_nombre,
            cantidad: Number(cantidad),
            precioUnitario: Number(precio),
            notas: notas,
            agregados: agregados, 
            imagen: imagen,
            groupId: groupId,
            customization: customization 
        };
    };

    const addToTicket = (item, cantidad, precio, notas, agregados = [], imagen = null, groupId = null, uniqueSubItemIdPart = null) => {
        const newItem = createTicketItem(item, cantidad, precio, notas, agregados, imagen, groupId, uniqueSubItemIdPart);
        setTicket(prevTicket => [...prevTicket, newItem]);
    };


    const handleProductClick = (product) => {
        const stockCheck = checkStock(product, 1);

        if (!stockCheck.available) {
            Swal.fire(
                'Insumo/s insuficiente/s',
                `Insumo/s: ${stockCheck.missingInsufficients.join(', ')} insuficiente/s para el producto ${product.producto_nombre}`,
                'error'
            );
            return;
        }

        if (agregadosTipoId && product.tipo_producto_id === agregadosTipoId) {
            addToTicket(product, 1, product.producto_precio, "Agregado");
            return;
        }

        if (Array.isArray(product.receta) && product.receta.length > 0) {
            setProductToCustomize(product);
            setEditingTicketItem(null);
            setIsEditingPromoItem(false);
            setIsModalOpen(true);
        } else {
            addToTicket(product, 1, product.producto_precio, "", [], product.producto_imagen || product.producto_imagen_url);
        }
    };

    const handlePromoClick = (promo) => {
        const insumosInsuficientesPromo = [];
        let productoInsuficiente = "";

        for (const item of promo.productos_promocion) {
            const productoComponente = productos.find(p => p.id === item.producto.id);
            if (productoComponente) {
                const stockCheck = checkStock(productoComponente, item.cantidad);
                if (!stockCheck.available) {
                    productoInsuficiente = productoComponente.producto_nombre;
                    insumosInsuficientesPromo.push(...stockCheck.missingInsufficients);
                }
            }
        }

        if (insumosInsuficientesPromo.length > 0) {
            Swal.fire(
                'Insumo/s insuficiente/s',
                `No se puede agregar la promoción "${promo.promocion_nombre}" porque faltan insumos para el producto "${productoInsuficiente}": ${insumosInsuficientesPromo.join(', ')}`,
                'error'
            );
            return;
        }

        const promoGroupId = `promo-${promo.id}-${Date.now()}`;
        const promoItem = {
            id: promo.id,
            producto_id: null,
            producto_nombre: promo.promocion_nombre,
        };

        addToTicket(
            promoItem, 1, promo.promocion_precio, "Promoción",
            [], promo.promocion_imagen || promo.promocion_imagen_url, promoGroupId
        );

        promo.productos_promocion.forEach(item => {
            const productoComponente = productos.find(p => p.id === item.producto.id);
            for (let i = 0; i < item.cantidad; i++) {
                const uniqueSubItemIdPart = `${item.producto.id}-${i}-${Date.now()}`;
                addToTicket(
                    item.producto,
                    1,
                    0,
                    `Parte de: ${promo.promocion_nombre}`,
                    [],
                    productoComponente?.producto_imagen || productoComponente?.producto_imagen_url || null,
                    promoGroupId,
                    uniqueSubItemIdPart
                );
            }
        });
    };

    const handleEditTicketItem = (ticketItem) => {
        const originalProduct = productos.find(p => p.id === ticketItem.producto_id);

        if (originalProduct && Array.isArray(originalProduct.receta) && originalProduct.receta.length > 0) {
            setProductToCustomize(originalProduct);
            setEditingTicketItem(ticketItem);
            setIsEditingPromoItem(!!ticketItem.groupId && ticketItem.precioUnitario === 0);
            setIsModalOpen(true);
        } else {
            Swal.fire('Atención', 'Este item no se puede personalizar.', 'info');
        }
    };

    // --- handleSaveCustomization (CON CORRECCIÓN PARA PROMOS) ---
    const handleSaveCustomization = (customizedItem) => {
        // customizedItem = { product, agregados: [...], precioTotal, customization: { base, aderezos, isTargetProduct } }
        
        const displayNotes = generateDisplayNotes(customizedItem.customization, customizedItem.agregados);
        const newTicketItems = [];

        if (editingTicketItem) {
            // --- Lógica de Edición ---
            
            let notasCombinadas = displayNotes;

            if (editingTicketItem.notas && editingTicketItem.notas.startsWith('Parte de:')) {
                const notaPersonalizada = displayNotes ? ` | ${displayNotes}` : '';
                const parteDeNota = editingTicketItem.notas.split(' | ')[0]; 
                notasCombinadas = `${parteDeNota}${notaPersonalizada}`;
            }

            const updatedMainItem = createTicketItem(
                customizedItem.product,
                editingTicketItem.cantidad,
                editingTicketItem.precioUnitario === 0 ? 0 : parseFloat(customizedItem.product.producto_precio),
                notasCombinadas,
                customizedItem.agregados, 
                customizedItem.product.producto_imagen || customizedItem.product.producto_imagen_url,
                editingTicketItem.groupId,
                null,
                customizedItem.customization
            );
            updatedMainItem.id = editingTicketItem.id;
            newTicketItems.push(updatedMainItem);

            // Re-crear los items "Agregado a..." (Solo para items normales)
            // (El modal previene que isPromoItem=true añada agregados)
            customizedItem.agregados.forEach(agregado => {
                newTicketItems.push(
                    createTicketItem( 
                        agregado, 
                        agregado.cantidad, 
                        agregado.producto_precio, 
                        `Agregado a ${customizedItem.product.producto_nombre}`, 
                        [], 
                        agregado.producto_imagen || agregado.producto_imagen_url, 
                        editingTicketItem.groupId,
                        null,
                        null
                    )
                );
            });
            
            // --- AQUI ESTÁ LA CORRECCIÓN ---
            setTicket(prevTicket => {
                
                // Usamos el estado 'isEditingPromoItem' que se seteó al abrir el modal
                if (isEditingPromoItem) {
                    // --- LÓGICA PARA ITEMS DE PROMO ---
                    // Estamos editando un sub-item (ej. Doble Cheddar)
                    // NO borramos el grupo. Solo reemplazamos el item.
                    
                    // 1. Filtramos el item específico que se editó
                    const ticketSinItemEditado = prevTicket.filter(
                        item => item.id !== editingTicketItem.id
                    );
                    
                    // 2. Añadimos el item actualizado
                    // newTicketItems SÓLO tiene el item actualizado (Doble Cheddar)
                    // ya que el modal no permite añadir agregados a items de promo.
                    return [...ticketSinItemEditado, ...newTicketItems];

                } else {
                    // --- LÓGICA PARA ITEMS NORMALES (CON AGREGADOS) ---
                    // Estamos editando un item normal.
                    // SÍ borramos el grupo (item + agregados) y lo reemplazamos.
                    
                    // 1. Filtramos TODOS los items del grupo
                    const ticketSinGrupoEditado = prevTicket.filter(
                        item => item.groupId !== editingTicketItem.groupId
                    );
                    
                    // 2. Devolvemos la lista filtrada + los nuevos items (item + agregados)
                    return [...ticketSinGrupoEditado, ...newTicketItems];
                }
            });
            // --- FIN DE LA CORRECCIÓN ---

        } else {
            // --- Lógica de Creación (Sin cambios) ---
            const newGroupId = `${customizedItem.product.id}-${Date.now()}`;
            
            newTicketItems.push(
                createTicketItem(
                    customizedItem.product, 
                    1, 
                    customizedItem.product.producto_precio, 
                    displayNotes,
                    customizedItem.agregados,
                    customizedItem.product.producto_imagen || customizedItem.product.producto_imagen_url, 
                    newGroupId,
                    null,
                    customizedItem.customization
                )
            );
            
            customizedItem.agregados.forEach(agregado => {
                newTicketItems.push(
                    createTicketItem(
                        agregado, 
                        agregado.cantidad, 
                        agregado.producto_precio, 
                        `Agregado a ${customizedItem.product.producto_nombre}`, 
                        [], 
                        agregado.producto_imagen || agregado.producto_imagen_url, 
                        newGroupId,
                        null,
                        null
                    )
                );
            });
            
            setTicket(prevTicket => [...prevTicket, ...newTicketItems]);
        }
        
        // Cerrar modal
        setIsModalOpen(false);
        setProductToCustomize(null);
        setEditingTicketItem(null);
        setIsEditingPromoItem(false);
    };
    // --- FIN DE LA FUNCIÓN ---


    const handleUpdateTicketQuantity = (itemId, amount) => {
        const itemToUpdate = ticket.find(item => item.id === itemId);
        if (!itemToUpdate) return;

        if (itemToUpdate.groupId && itemToUpdate.precioUnitario === 0) {
            Swal.fire('Atención', 'La cantidad de los items de promoción no se puede modificar.', 'info');
            return;
        }

        const newQuantity = Math.max(1, itemToUpdate.cantidad + amount);
        const cantidadAChequear = newQuantity - itemToUpdate.cantidad;

        if (cantidadAChequear > 0) {
            const originalProduct = productos.find(p => p.id === itemToUpdate.producto_id);
            if (originalProduct) {
                const stockCheck = checkStock(originalProduct, cantidadAChequear);
                if (!stockCheck.available) {
                    Swal.fire(
                        'Insumo/s insuficiente/s',
                        `No se puede aumentar la cantidad. Insumo: ${stockCheck.missingInsufficients.join(', ')} insuficiente/s para ${originalProduct.producto_nombre}`,
                        'error'
                    );
                    return;
                }
            }
        }

        setTicket(prevTicket =>
            prevTicket.map(item => {
                if (item.id === itemId) {
                    return { ...item, cantidad: newQuantity };
                }
                return item;
            }).filter(item => item.cantidad > 0)
        );
    };

    const handleRemoveFromTicket = (itemToRemove) => {
        setTicket(prevTicket => {
            if (itemToRemove.groupId) {
                return prevTicket.filter(item => item.groupId !== itemToRemove.groupId);
            }
            return prevTicket.filter(item => item.id !== itemToRemove.id);
        });
    };

    const handleVaciarPedido = () => {
        Swal.fire({
            title: '¿Vaciar Pedido?',
            text: "Se quitarán todos los productos del pedido actual.",
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#d33', confirmButtonText: 'Sí, vaciar', cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                setTicket([]);
                setClienteSeleccionado(null);
            }
        });
    };

    const handleClienteSeleccionado = (cliente) => {
        setClienteSeleccionado(cliente);
        setIsClienteModalOpen(false);
    };

    const handleFinalizarPedido = async () => {
        // Validación final de stock (copiada de tu código, asumo que está ok)
        const insumosInsuficientesFinal = [];
        for (const [insumoId, demandaTotal] of insumoDemand.entries()) {
            const insumoEnStock = insumosStock.find(i => i.id === insumoId);
            const stockTotal = parseFloat(insumoEnStock?.insumo_stock || 0);

            if (stockTotal < demandaTotal) {
                insumosInsuficientesFinal.push(insumoEnStock?.insumo_nombre || `ID ${insumoId}`);
            }
        }
        if (insumosInsuficientesFinal.length > 0) {
            Swal.fire(
                'Error de Stock',
                `No se puede finalizar el pedido. El stock es insuficiente para: ${insumosInsuficientesFinal.join(', ')}. Revise el pedido o el stock.`,
                'error'
            );
            return;
        }
        // Fin validación stock

        const payload = {
            cliente: clienteSeleccionado ? clienteSeleccionado.id : null,
            detalles: ticket.map(item => {
                
                let notasFinalesParaBackend = '';
                const customNotes = item.customization 
                    ? generateDisplayNotes(item.customization, item.agregados) 
                    : '';

                if (item.producto_id === null && item.notas === "Promoción") {
                    notasFinalesParaBackend = item.nombre;
                
                } else if (item.precioUnitario === 0 && item.notas.startsWith('Parte de:')) {
                    const parteDeNota = item.notas.split(' | ')[0];
                    notasFinalesParaBackend = customNotes ? `${parteDeNota} (${customNotes})` : parteDeNota;
                
                } else if (item.notas.startsWith('Agregado a')) {
                    notasFinalesParaBackend = item.notas;
                
                } else if (customNotes) {
                    notasFinalesParaBackend = `${item.nombre} (${customNotes})`;
                
                } else {
                    notasFinalesParaBackend = item.nombre;
                }

                return {
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    notas: notasFinalesParaBackend,
                    precio_unitario: item.precioUnitario
                };
            })
        };

        try {
            console.log("Enviando payload:", JSON.stringify(payload, null, 2));
            await apiClient.post('/pedido/pedidos/', payload);

            Swal.fire('¡Éxito!', 'El pedido ha sido creado y enviado a cocina.', 'success');
            setTicket([]);
            setClienteSeleccionado(null); 
            
            const resInsumos = await apiClient.get('/inventario/insumos/');
            setInsumosStock(resInsumos.data);

        } catch (error) {
            Swal.fire('Error', 'No se pudo crear el pedido.', 'error');
            console.error("Error al crear pedido:", error.response?.data || error);
        }
    };

    if (isVerifyingCaja) {
        return (
            <div className={styles.posContainer} style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2rem' }}>
                Verificando estado de la caja...
            </div>
        );
    }

    return (
        <div className={styles.posContainer}>
            {/* Columna Izquierda: Catálogo */}
            <div className={styles.catalogoContainer}>
                <nav className={styles.navTabs}>
                    <button onClick={() => setActiveTab('productos')} className={activeTab === 'productos' ? styles.active : ''}>Productos</button>
                    <button onClick={() => setActiveTab('promociones')} className={activeTab === 'promociones' ? styles.active : ''}>Promociones</button>
                </nav>

                {activeTab === 'productos' && (
                    <div className={styles.tipoFiltro}>
                        {tiposProducto.map(tipo => (
                            <button key={tipo.id} onClick={() => setSelectedTipo(tipo.id)} className={selectedTipo === tipo.id ? styles.active : ''}>
                                {tipo.tipo_producto_nombre}
                            </button>
                        ))}
                    </div>
                )}

                <div className={styles.gridContainer}>
                    {loading ? <p>Cargando...</p> : (
                        activeTab === 'productos' ? (
                            productosFiltrados.map(p => (
                                <div key={p.id} className={styles.productCard} onClick={() => handleProductClick(p)}>
                                    <img src={p.producto_imagen || p.producto_imagen_url || 'https://placehold.co/100x100/e1e1e1/777?text=N/A'} alt={p.producto_nombre} />
                                    <div className={styles.cardBody}>
                                        <span className={styles.cardTitle}>{p.producto_nombre}</span>
                                        <span className={styles.cardPrice}>${p.producto_precio}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            promociones.map(promo => (
                                <div key={promo.id} className={styles.productCard} onClick={() => handlePromoClick(promo)}>
                                    <img src={promo.promocion_imagen || promo.promocion_imagen_url || 'https://placehold.co/100x100/e1e1e1/777?text=PROMO'} alt={promo.promocion_nombre} />
                                    <div className={styles.cardBody}>
                                        <span className={styles.cardTitle}>{promo.promocion_nombre}</span>
                                        <span className={styles.cardPrice}>${promo.promocion_precio}</span>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Columna Derecha: Ticket */}
            <div className={styles.ticketContainer}>
                <h3>Pedido Actual</h3>
                <div className={styles.ticketItems}>
                    {ticket.length === 0 ? (
                        <p className={styles.ticketEmpty}>El pedido está vacío.</p>
                    ) : (
                        ticket.map(item => (
                            <div key={item.id} className={`${styles.ticketItem} ${item.groupId ? styles.promoSubItem : ''}`}>
                                <img
                                    src={item.imagen || 'https://placehold.co/40x40/e1e1e1/777?text=N/A'}
                                    alt={item.nombre}
                                    className={styles.ticketItemImage}
                                />
                                <div className={styles.itemInfo}>
                                    <span className={styles.itemNombre}>{item.nombre}</span>
                                    {item.notas && <span className={styles.itemNotas}>{item.notas.replace(/ \| /g, ', ')}</span>}
                                </div>
                                <div className={styles.itemActions}>
                                    {(item.producto_id && Array.isArray(productos.find(p => p.id === item.producto_id)?.receta)) && (
                                        <button
                                            onClick={() => handleEditTicketItem(item)}
                                            className={styles.editButton}
                                            title="Personalizar item"
                                        >✎</button>
                                    )}
                                    {!item.groupId || (item.groupId && item.precioUnitario > 0) ? (
                                        <div className={styles.quantityStepper}>
                                            <button onClick={() => handleUpdateTicketQuantity(item.id, -1)}>-</button>
                                            <span>{item.cantidad}</span>
                                            <button onClick={() => handleUpdateTicketQuantity(item.id, 1)}>+</button>
                                        </div>
                                    ) : (item.notas && item.notas.startsWith('Parte de:') && <span className={styles.promoItemQuantity}>x {item.cantidad}</span>)
                                    }
                                    {item.precioUnitario > 0 && <span className={styles.itemPrecio}>${(item.precioUnitario * item.cantidad).toFixed(2)}</span>}
                                    <button onClick={() => handleRemoveFromTicket(item)} className={styles.removeButton}>&times;</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {/* Total y Botones */}
                <div className={styles.ticketTotal}>
                    <span>TOTAL</span>
                    <span>${new Intl.NumberFormat('es-AR').format(ticketTotal)}</span>
                </div>

                <button
                    className={`${styles.clienteButton} ${clienteSeleccionado ? styles.seleccionado : ''}`}
                    onClick={() => setIsClienteModalOpen(true)}
                >
                    {clienteSeleccionado ? `Cliente: ${clienteSeleccionado.cliente_nombre}` : 'Asignar Cliente'}
                </button>

                <button
                    className={styles.vaciarButton}
                    onClick={handleVaciarPedido}
                    disabled={ticket.length === 0}
                >
                    Vaciar Pedido
                </button>
                <button
                    className={styles.finalizarButton}
                    onClick={handleFinalizarPedido}
                    disabled={loading || ticket.length === 0}
                >
                    FINALIZAR Y ENVIAR A COCINA
                </button>
            </div>

            {/* Modal de Personalización Producto */}
            {isModalOpen && (
                <CustomizeProductModal
                    product={productToCustomize}
                    initialData={editingTicketItem}
                    isPromoItem={isEditingPromoItem}
                    allProducts={productos}
                    allTipos={tiposProducto}
                    insumosStock={insumosStock}
                    insumoDemand={insumoDemand}
                    onClose={() => {
                        setIsModalOpen(false);
                        setProductToCustomize(null);
                        setEditingTicketItem(null);
                        setIsEditingPromoItem(false);
                    }}
                    onSave={handleSaveCustomization}
                />
            )}

            {isClienteModalOpen && (
                <SelectClienteModal
                    onClose={() => setIsClienteModalOpen(false)}
                    onClienteSeleccionado={handleClienteSeleccionado}
                />
            )}
        </div>
    );
};

export default PedidosPage;