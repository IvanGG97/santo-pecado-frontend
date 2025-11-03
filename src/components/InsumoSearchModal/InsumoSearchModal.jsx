import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/api';
import styles from './InsumoSearchModal.module.css'; // Crearemos este archivo

const InsumoSearchModal = ({ onClose, onInsumoSelected }) => {
    const [allInsumos, setAllInsumos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Cargar todos los insumos al abrir el modal
    useEffect(() => {
        const fetchInsumos = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get('/inventario/insumos/');
                setAllInsumos(response.data);
            } catch (err) {
                console.error("Error al cargar insumos:", err);
                setError('No se pudieron cargar los insumos.');
            } finally {
                setLoading(false);
            }
        };
        fetchInsumos();
    }, []);

    // Lógica de filtrado
    const filteredInsumos = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) {
            return allInsumos; // Mostrar todos si no hay búsqueda
        }
        return allInsumos.filter(insumo => 
            insumo.insumo_nombre.toLowerCase().includes(term)
        );
    }, [allInsumos, searchTerm]);

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>&times;</button>
                <h2>Buscar Insumo</h2>

                <div className={styles.searchBar}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className={styles.insumoListContainer}>
                    {loading && <p>Cargando insumos...</p>}
                    {error && <p className={styles.errorText}>{error}</p>}
                    
                    {!loading && !error && filteredInsumos.length === 0 && (
                        <p className={styles.noResults}>No se encontraron insumos.</p>
                    )}

                    {!loading && !error && filteredInsumos.map(insumo => (
                        <div 
                            key={insumo.id} 
                            className={styles.insumoItem} 
                            onClick={() => onInsumoSelected(insumo)}
                        >
                            <img 
                                src={insumo.insumo_imagen || insumo.insumo_imagen_url || 'https://placehold.co/40x40/e1e1e1/777?text=N/A'} 
                                alt={insumo.insumo_nombre}
                                className={styles.insumoImage}
                            />
                            <div className={styles.insumoInfo}>
                                <span className={styles.insumoNombre}>{insumo.insumo_nombre}</span>
                                <span className={styles.insumoStock}>
                                    Stock Actual: {insumo.insumo_stock} ({insumo.insumo_unidad})
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InsumoSearchModal;