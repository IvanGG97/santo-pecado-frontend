import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/api';
import styles from './PedidosPage.module.css';
import Swal from 'sweetalert2';
import CustomizeProductModal from '../../components/CustomizeProductModal/CustomizeProductModal';

const PedidosPage = () => {
    const [productos, setProductos] = useState([]);
    const [promociones, setPromociones] = useState([]);
    const [tiposProducto, setTiposProducto] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('productos');
    const [selectedTipo, setSelectedTipo] = useState('todos');

    const [ticket, setTicket] = useState([]);
    const [ticketTotal, setTicketTotal] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToCustomize, setProductToCustomize] = useState(null);

    const [editingTicketItem, setEditingTicketItem] = useState(null);
    const [isEditingPromoItem, setIsEditingPromoItem] = useState(false);

    // Carga inicial de datos
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [resProductos, resPromos, resTipos] = await Promise.all([
                    apiClient.get('/inventario/productos/'),
                    apiClient.get('/promocion/promociones/'),
                    apiClient.get('/inventario/tipos-producto/')
                ]);

                setProductos(resProductos.data.filter(p => p.producto_disponible));
                setPromociones(resPromos.data.filter(p => p.promocion_disponible && p.promocion_stock > 0));
                setTiposProducto([{ id: 'todos', tipo_producto_nombre: 'Todos' }, ...resTipos.data]);

            } catch (error) {
                Swal.fire('Error', 'No se pudieron cargar los datos del menú.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Calcular el total cada vez que el ticket cambia
    useEffect(() => {
        const total = ticket.reduce((sum, item) => sum + (Number(item.precioUnitario) * Number(item.cantidad)), 0);
        setTicketTotal(total);
    }, [ticket]);

    // --- Lógica del Pedido ---

    const handleProductClick = (product) => {
        if (product.tipo_producto === 'Agregados') {
            addToTicket(product, 1, product.producto_precio, "Agregado");
            return;
        }
        if (product.receta && product.receta.length > 0) {
            setProductToCustomize(product);
            setEditingTicketItem(null); // No estamos editando
            setIsEditingPromoItem(false); // --- ¡CORRECCIÓN AÑADIDA! ---
            setIsModalOpen(true);
        } else {
            addToTicket(product, 1, product.producto_precio, "", [], product.producto_imagen || product.producto_imagen_url);
        }
    };

    const handlePromoClick = (promo) => {
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
            addToTicket(
                item.producto, item.cantidad, 0,
                `Parte de: ${promo.promocion_nombre}`, [],
                productoComponente?.producto_imagen || productoComponente?.producto_imagen_url || null,
                promoGroupId
            );
        });
    };

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

    const handleSaveCustomization = (customizedItem) => {
        if (editingTicketItem) {
            // --- LÓGICA DE EDICIÓN (CORREGIDA) ---
            const ticketSinAgregadosAntiguos = ticket.filter(
                item => !(item.groupId === editingTicketItem.id && item.notas.startsWith('Agregado a'))
            );

            // --- INICIO CORRECCIÓN DE NOTAS ---
            let notasCombinadas = customizedItem.notas; // Notas de personalización (ej: "Sin tomate")
            // Si el item original tenía una nota "Parte de:", la conservamos
            if (editingTicketItem.notas && editingTicketItem.notas.startsWith('Parte de:')) {
                // Si hay personalización, la añadimos después de "Parte de:", sino, dejamos solo "Parte de:"
                notasCombinadas = customizedItem.notas
                    ? `${editingTicketItem.notas} | ${customizedItem.notas}`
                    : editingTicketItem.notas;
            }
            // --- FIN CORRECCIÓN DE NOTAS ---

            setTicket(prevTicket =>
                ticketSinAgregadosAntiguos.map(item => {
                    if (item.id === editingTicketItem.id) {
                        return {
                            ...item,
                            nombre: customizedItem.product.producto_nombre,
                            precioUnitario: item.precioUnitario === 0 ? 0 : parseFloat(customizedItem.product.producto_precio),
                            notas: notasCombinadas, // Usamos las notas combinadas
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
            // --- LÓGICA DE AÑADIR (SIN CAMBIOS) ---
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

    const addToTicket = (item, cantidad, precio, notas, agregados = [], imagen = null, groupId = null) => {
        setTicket(prevTicket => {
            const newItem = {
                id: groupId ? `${item.id}-${groupId}` : `${item.id}-${Date.now()}`,

                // --- ESTA ES LA LÍNEA CORREGIDA ---
                // Esta lógica respeta el 'producto_id: null' de las promociones
                // y usa el 'item.id' para productos normales o 'item.producto_id' si existe.
                producto_id: item.producto_id === null ? null : (item.producto_id || item.id),
                // --- FIN DE LA CORRECCIÓN ---

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

    const handleUpdateTicketQuantity = (itemId, amount) => {
        setTicket(prevTicket =>
            prevTicket.map(item => {
                if (item.id === itemId) {
                    const newQuantity = Math.max(1, item.cantidad + amount);
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
            }
        });
    };

    const handleFinalizarPedido = async () => {
        if (ticket.length === 0) {
            Swal.fire('Error', 'El pedido está vacío.', 'error');
            return;
        }

        const payload = {
            detalles: ticket.map(item => {
                // --- INICIO DE LAS CORRECCIONES ---

                let notasFinalesParaBackend = '';
                const notasAgregados = item.agregados?.map(ag => `+ ${ag.cantidad}x ${ag.producto_nombre}`).join(', ') || '';

                // 1. Manejo del nombre de la promoción principal
                if (item.producto_id === null && item.notas === "Promoción") {
                    // Si es el item principal de la promo, usamos su nombre real
                    notasFinalesParaBackend = item.nombre;
                } else {
                    // 2. Combinar notas originales (Parte de:) con personalizaciones y agregados
                    const partesNotas = [];
                    // Si la nota original indica que es parte de una promo, la incluimos
                    if (item.notas && item.notas.startsWith('Parte de:')) {
                        partesNotas.push(item.notas);
                    }
                    // Añadimos las notas de personalización (ej: Sin lechuga) si existen y no son "Parte de:"
                    if (item.notas && !item.notas.startsWith('Parte de:')) {
                        partesNotas.push(item.notas);
                    }
                    // Añadimos las notas de los agregados
                    if (notasAgregados) {
                        partesNotas.push(notasAgregados);
                    }

                    // Unimos las partes. Si no hay notas, usamos el nombre del item como fallback.
                    notasFinalesParaBackend = partesNotas.join(' | ') || item.nombre;
                }

                // --- FIN DE LAS CORRECCIONES ---

                return {
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    notas: notasFinalesParaBackend, // Usamos las notas procesadas
                    precio_unitario: item.precioUnitario
                };
            })
        };

        try {
            console.log("Enviando payload:", JSON.stringify(payload, null, 2)); // Log para depurar
            await apiClient.post('/pedido/pedidos/', payload);
            Swal.fire('¡Éxito!', 'El pedido ha sido creado y enviado a cocina.', 'success');
            setTicket([]);
        } catch (error) {
            Swal.fire('Error', 'No se pudo crear el pedido.', 'error');
            console.error("Error al crear pedido:", error.response?.data || error);
            console.error("Payload enviado:", JSON.stringify(payload, null, 2)); // Log del payload en caso de error
        }
    };

    const productosFiltrados = useMemo(() => {
        return productos.filter(p =>
            selectedTipo === 'todos' || p.tipo_producto_id === selectedTipo
        );
    }, [productos, selectedTipo]);

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
                                            {item.agregados.map(ag =>
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

                                    {/* El stepper de cantidad solo se muestra para items que no son sub-items de una promo */}
                                    {!item.groupId || (item.groupId && item.precioUnitario > 0) ? (
                                        <div className={styles.quantityStepper}>
                                            <button onClick={() => handleUpdateTicketQuantity(item.id, -1)}>-</button>
                                            <span>{item.cantidad}</span>
                                            <button onClick={() => handleUpdateTicketQuantity(item.id, 1)}>+</button>
                                        </div>
                                    ) : (
                                        // Para sub-items de promo, mostramos la cantidad fija
                                        item.notas.startsWith('Parte de') && <span className={styles.promoItemQuantity}>x {item.cantidad}</span>
                                    )}

                                    {/* El precio solo se muestra si es mayor a 0 */}
                                    {item.precioUnitario > 0 &&
                                        <span className={styles.itemPrecio}>${(item.precioUnitario * item.cantidad).toFixed(2)}</span>}
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

            {/* Modal de Personalización */}
            {isModalOpen && (
                <CustomizeProductModal
                    product={productToCustomize}
                    initialData={editingTicketItem}
                    isPromoItem={isEditingPromoItem} // <-- Pasamos la prop
                    allProducts={productos}
                    allTipos={tiposProducto}
                    onClose={() => {
                        // --- ¡CORRECCIÓN AÑADIDA! ---
                        // Reseteamos todos los estados al cerrar
                        setIsModalOpen(false);
                        setProductToCustomize(null);
                        setEditingTicketItem(null);
                        setIsEditingPromoItem(false);
                    }}
                    onSave={handleSaveCustomization}
                />
            )}
        </div>
    );
};

export default PedidosPage;
