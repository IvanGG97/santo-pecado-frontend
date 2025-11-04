import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. IMPORTAR useNavigate
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

    const [loading, setLoading] = useState(true); // Este loading es para los datos de la página
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

    // --- 2. NUEVOS ESTADOS PARA VERIFICACIÓN ---
    const [isVerifyingCaja, setIsVerifyingCaja] = useState(true);
    const navigate = useNavigate();
    // --- FIN DE NUEVOS ESTADOS ---


    // --- 3. NUEVO: useEffect para verificar la caja (se ejecuta primero) ---
    useEffect(() => {
        const checkCajaStatus = async () => {
            try {
                const res = await apiClient.get('/caja/estado/');
                // Si la caja está abierta (estado es true)
                if (res.data && res.data.caja_estado === true) {
                    setIsVerifyingCaja(false); // Permite la carga de la página
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
                // Error de red (ej. API caída)
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
    // --- FIN DEL NUEVO useEffect ---


    // --- 4. MODIFICADO: useEffect para cargar datos (depende de la verificación) ---
    useEffect(() => {
        // Solo cargar datos SI la caja está verificada y abierta
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

    }, [isVerifyingCaja]); // <-- Se ejecuta cuando isVerifyingCaja cambia a false

    // Calcular el total (sin cambios)
    useEffect(() => {
        const total = ticket.reduce((sum, item) => sum + (Number(item.precioUnitario) * Number(item.cantidad)), 0);
        setTicketTotal(total);
    }, [ticket]);

    // Filtrar productos para la grilla (sin cambios)
    const productosFiltrados = useMemo(() => {
        return productos.filter(p => {
            const tipoCoincide = selectedTipo === 'todos' || p.tipo_producto_id === selectedTipo;
            const esAgregado = p.tipo_producto_id === agregadosTipoId;
            const mostrarAgregado = esAgregado && selectedTipo === agregadosTipoId;
            const noEsAgregadoVisibleNormalmente = !esAgregado;
            return tipoCoincide && (noEsAgregadoVisibleNormalmente || mostrarAgregado);
        });
    }, [productos, selectedTipo, agregadosTipoId]);


    // Hook useMemo para calcular la demanda de insumos (sin cambios)
    const insumoDemand = useMemo(() => {
        const demandMap = new Map(); // <insumoId, totalUsado>

        if (!productos || productos.length === 0) {
            return demandMap;
        }

        for (const ticketItem of ticket) {
            const productInfo = productos.find(p => p.id === ticketItem.producto_id);
            
            if (productInfo && productInfo.receta) {
                for (const recetaItem of productInfo.receta) {
                    const insumoId = recetaItem.insumo.id;
                    const cantidadRequerida = parseFloat(recetaItem.producto_insumo_cantidad);
                    
                    const demandaActual = demandMap.get(insumoId) || 0;
                    
                    demandMap.set(insumoId, demandaActual + (cantidadRequerida * ticketItem.cantidad));
                }
            }
        }
        return demandMap;
    }, [ticket, productos]);


    // --- Verificador de Stock (Sin cambios) ---
    const checkStock = (producto, cantidadAChequear) => {
        const missingInsufficients = [];

        if (producto && producto.receta && producto.receta.length > 0) {
            for (const recetaItem of producto.receta) {
                const insumoId = recetaItem.insumo.id;
                const insumoNombre = recetaItem.insumo.insumo_nombre;
                const cantidadRequeridaPorUnidad = parseFloat(recetaItem.producto_insumo_cantidad);

                const insumoEnStock = insumosStock.find(i => i.id === insumoId);
                const stockTotal = parseFloat(insumoEnStock?.insumo_stock || 0);
                const demandaActual = insumoDemand.get(insumoId) || 0;
                const stockRestante = stockTotal - demandaActual;

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

    // handleProductClick (sin cambios)
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

        if (product.receta && product.receta.length > 0) {
            setProductToCustomize(product);
            setEditingTicketItem(null);
            setIsEditingPromoItem(false);
            setIsModalOpen(true);
        } else {
            addToTicket(product, 1, product.producto_precio, "", [], product.producto_imagen || product.producto_imagen_url);
        }
    };

    // handlePromoClick (sin cambios)
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

    // handleEditTicketItem (sin cambios)
    const handleEditTicketItem = (ticketItem) => {
        const originalProduct = productos.find(p => p.id === ticketItem.producto_id);

        if (originalProduct && originalProduct.receta && originalProduct.receta.length > 0) {
            setProductToCustomize(originalProduct);
            setEditingTicketItem(ticketItem);
            setIsEditingPromoItem(!!ticketItem.groupId && ticketItem.precioUnitario === 0);
            setIsModalOpen(true);
        } else {
            Swal.fire('Atención', 'Este item no se puede personalizar.', 'info');
        }
    };

    // handleSaveCustomization (sin cambios)
    const handleSaveCustomization = (customizedItem) => {
        const insumosInsuficientesAgregados = [];
        let agregadoInsuficiente = "";

        for (const agregado of customizedItem.agregados) {
            const stockCheck = checkStock(agregado, agregado.cantidad); 
            if (!stockCheck.available) {
                agregadoInsuficiente = agregado.producto_nombre;
                insumosInsuficientesAgregados.push(...stockCheck.missingInsufficients);
            }
        }

        if (insumosInsuficientesAgregados.length > 0) {
             Swal.fire(
                'Insumo/s insuficiente/s',
                `No se puede añadir el agregado "${agregadoInsuficiente}" porque falta: ${insumosInsuficientesAgregados.join(', ')}`,
                'error'
            );
            return; 
        }

        if (editingTicketItem) {
            const ticketSinAgregadosAntiguos = ticket.filter(
                item => !(item.groupId === editingTicketItem.id && item.notas.startsWith('Agregado a'))
            );

            let notasCombinadas = customizedItem.notas;

            if (editingTicketItem.notas && editingTicketItem.notas.startsWith('Parte de:')) {
                notasCombinadas = customizedItem.notas
                    ? `${editingTicketItem.notas} | ${customizedItem.notas}`
                    : editingTicketItem.notas;
            }
            setTicket(prevTicket =>
                ticketSinAgregadosAntiguos.map(item => {
                    if (item.id === editingTicketItem.id) {
                        return {
                            ...item,
                            nombre: customizedItem.product.producto_nombre,
                            precioUnitario: item.precioUnitario === 0 ? 0 : parseFloat(customizedItem.product.producto_precio),
                            notas: notasCombinadas,
                            agregados: [], 
                            cantidad: item.cantidad
                        };
                    }
                    return item;
                })
            );

            customizedItem.agregados.forEach(agregado => {
                addToTicket(agregado, agregado.cantidad, agregado.producto_precio, `Agregado a ${customizedItem.product.producto_nombre}`, [], agregado.producto_imagen || agregado.producto_imagen_url, editingTicketItem.id);
            });
        } else {
            const newGroupId = `${customizedItem.product.id}-${Date.now()}`;
            addToTicket(customizedItem.product, 1, customizedItem.product.producto_precio, customizedItem.notas, [], customizedItem.product.producto_imagen || customizedItem.product.producto_imagen_url, newGroupId);
            
            customizedItem.agregados.forEach(agregado => {
                addToTicket(agregado, agregado.cantidad, agregado.producto_precio, `Agregado a ${customizedItem.product.producto_nombre}`, [], agregado.producto_imagen || agregado.producto_imagen_url, newGroupId);
            });
        }
        setIsModalOpen(false);
        setProductToCustomize(null);
        setEditingTicketItem(null);
        setIsEditingPromoItem(false);
    };

    // addToTicket (sin cambios)
    const addToTicket = (item, cantidad, precio, notas, agregados = [], imagen = null, groupId = null, uniqueSubItemIdPart = null) => {
        setTicket(prevTicket => {
            const finalId = groupId && uniqueSubItemIdPart
                ? `${groupId}-${uniqueSubItemIdPart}`
                : (groupId ? `${item.id}-${groupId}-${Date.now()}` : `${item.id}-${Date.now()}`);
            const newItem = {
                id: finalId,
                producto_id: item.producto_id === null ? null : (item.producto_id || item.id),
                nombre: item.producto_nombre,
                cantidad: Number(cantidad),
                precioUnitario: Number(precio),
                notas: notas,
                agregados: agregados,
                imagen: imagen,
                groupId: groupId
            };
            return [...prevTicket, newItem];
        });
    };

    // handleUpdateTicketQuantity (sin cambios)
    const handleUpdateTicketQuantity = (itemId, amount) => {
        const itemToUpdate = ticket.find(item => item.id === itemId);
        if (!itemToUpdate) return;

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

    // handleRemoveFromTicket (sin cambios)
    const handleRemoveFromTicket = (itemToRemove) => {
        setTicket(prevTicket => {
            if (itemToRemove.groupId) {
                return prevTicket.filter(item => item.groupId !== itemToRemove.groupId);
            }
            return prevTicket.filter(item => item.id !== itemToRemove.id);
        });
    };

    // handleVaciarPedido (sin cambios)
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

    // handleClienteSeleccionado (sin cambios)
    const handleClienteSeleccionado = (cliente) => {
        setClienteSeleccionado(cliente);
        setIsClienteModalOpen(false); 
    };

    // handleFinalizarPedido (sin cambios)
    const handleFinalizarPedido = async () => {
        if (ticket.length === 0) {
            Swal.fire('Error', 'El pedido está vacío.', 'error');
            return;
        }

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

        const payload = {
            cliente: clienteSeleccionado ? clienteSeleccionado.id : null,
            detalles: ticket.map(item => {
                
                let notasFinalesParaBackend = '';
                const notasAgregados = item.agregados?.map(ag => `+ ${ag.cantidad}x ${ag.producto_nombre}`).join(', ') || '';

                if (item.producto_id === null && item.notas === "Promoción") {
                    notasFinalesParaBackend = item.nombre;
                } else {
                    const partesNotas = [];
                    if (item.notas && item.notas.startsWith('Parte de:')) {
                        partesNotas.push(item.notas);
                    }
                    if (item.notas && !item.notas.startsWith('Parte de:') && !item.notas.startsWith('Agregado a')) {
                        partesNotas.push(item.notas);
                    }
                    if (item.notas && item.notas.startsWith('Agregado a')) {
                         partesNotas.push(item.notas);
                    }
                    if (notasAgregados) { 
                        partesNotas.push(notasAgregados);
                    }
                    notasFinalesParaBackend = partesNotas.join(' | ') || item.nombre;
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

    // --- 5. NUEVO: Pantalla de verificación ---
    if (isVerifyingCaja) {
        return (
            <div className={styles.posContainer} style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2rem' }}>
                Verificando estado de la caja...
            </div>
        );
    }
    // --- FIN ---

    // --- Renderizado (sin cambios en el JSX) ---
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
                                    {item.notas && <span className={styles.itemNotas}>{item.notas}</span>}
                                    {item.agregados && item.agregados.length > 0 && (
                                        <ul className={styles.itemAgregados}>
                                            { /* @ts-ignore */ item.agregados.map(ag =>
                                                <li key={ag.id}>+ {ag.cantidad}x {ag.producto_nombre}</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                <div className={styles.itemActions}>
                                    {item.producto_id && productos.find(p => p.id === item.producto_id)?.receta?.length > 0 && (
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

