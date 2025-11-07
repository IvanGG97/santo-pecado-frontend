import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../services/api';
// Importamos los nuevos estilos
import styles from './EmpleadoPage.module.css'; 
import Swal from 'sweetalert2';
import EditEmployeeModal from '../../components/EditEmployeeModal/EditEmployeeModal';

// --- Constantes para Filtros de Rol (similar a ComprasPage) ---
const ROLES_FILTRO = [
    { value: 'todos', label: 'Todos' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Encargado/Cajero', label: 'Encargado/Cajero' },
    { value: 'Cocina', label: 'Cocina' }
    // Puedes añadir más roles aquí si es necesario
];

// --- Mapa de Prioridad para Ordenar ---
const ROLES_PRIORITARIOS = {
    'Admin': 1,
    'Encargado/Cajero': 2,
    'Cocina': 3
};

const EmpleadoPage = () => {
    const [allEmpleados, setAllEmpleados] = useState([]);
    const [loading, setLoading] = useState(true); // Inicia en true para la carga inicial
    const [error, setError] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // --- Estados para los INPUTS de filtro ---
    const [inputNombre, setInputNombre] = useState('');
    const [inputApellido, setInputApellido] = useState('');
    const [inputUsername, setInputUsername] = useState('');
    const [inputRol, setInputRol] = useState('todos'); // Default 'todos'

    // --- Estado para los FILTROS ACTIVOS ---
    const [activeFilters, setActiveFilters] = useState({
        nombre: '',
        apellido: '',
        username: '',
        rol: 'todos',
    });

    // --- Carga de Datos (con useCallback) ---
    const fetchEmpleados = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/empleado/list/');
            setAllEmpleados(response.data);
        } catch (err) {
            setError('Error al cargar los empleados.');
            console.error(err);
            Swal.fire('Error', 'No se pudieron cargar los empleados.', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // --- Carga Inicial (Eliminamos showList) ---
    useEffect(() => {
        fetchEmpleados();
    }, [fetchEmpleados]);

    // --- Lógica de Filtrado y Orden (useMemo) ---
    const filteredEmpleados = useMemo(() => {
        const termNombre = activeFilters.nombre.toLowerCase().trim();
        const termApellido = activeFilters.apellido.toLowerCase().trim();
        const termUsername = activeFilters.username.toLowerCase().trim();
        const termRol = activeFilters.rol;

        return allEmpleados
            .filter(emp => {
                const nombreCompleto = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase().trim();

                // Filtro por Nombre (busca en nombre y apellido)
                if (termNombre && !nombreCompleto.includes(termNombre)) {
                    return false;
                }
                // Filtro por Apellido (busca en nombre y apellido)
                if (termApellido && !nombreCompleto.includes(termApellido)) {
                    return false;
                }
                // Filtro por Username
                if (termUsername && !(emp.username || '').toLowerCase().includes(termUsername)) {
                    return false;
                }
                // Filtro por Rol
                if (termRol !== 'todos' && (emp.rol || 'No asignado') !== termRol) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => {
                // Lógica de Orden por Prioridad (Goal 3)
                const priorityA = ROLES_PRIORITARIOS[a.rol] || 99;
                const priorityB = ROLES_PRIORITARIOS[b.rol] || 99;

                if (priorityA !== priorityB) {
                    return priorityA - priorityB; // Ordena por prioridad (1, 2, 3... 99)
                }
                
                // Si tienen la misma prioridad, ordena alfabéticamente
                return (a.first_name || '').localeCompare(b.first_name || '');
            });
    }, [allEmpleados, activeFilters]);


    // --- Handlers para Filtros (NUEVO) ---
    const handleAplicarFiltros = () => {
        setActiveFilters({
            nombre: inputNombre,
            apellido: inputApellido,
            username: inputUsername,
            rol: inputRol,
        });
    };

    const handleLimpiarFiltros = () => {
        setInputNombre('');
        setInputApellido('');
        setInputUsername('');
        setInputRol('todos');
        setActiveFilters({
            nombre: '',
            apellido: '',
            username: '',
            rol: 'todos',
        });
    };

    // --- Lógica de Modales (Sin cambios, excepto onSuccess) ---
    const handleEditClick = (employee) => {
        setSelectedEmployee(employee);
        setIsEditModalOpen(true);
    };

    const handleModalClose = () => {
        setIsEditModalOpen(false);
        setSelectedEmployee(null);
    };

    const handleModalSuccess = () => {
        setIsEditModalOpen(false);
        setSelectedEmployee(null);
        fetchEmpleados(); // Refresca la lista
    };


    return (
        <div className={styles.container}> {/* Renombrado de .comprasContainer */}
            <h1>Gestión de Empleados</h1>

            {/* --- BARRA DE FILTROS (NUEVA) --- */}
            <div className={styles.filtrosContainer}>
                
                {/* Filtro Nombre */}
                <div className={styles.filtroGrupo}>
                    <label htmlFor="nombreSearch">Nombre:</label>
                    <input
                        type="text"
                        id="nombreSearch"
                        placeholder="Buscar por Nombre..."
                        value={inputNombre}
                        onChange={(e) => setInputNombre(e.target.value)}
                        className={styles.filtroInput}
                    />
                </div>

                {/* Filtro Apellido */}
                <div className={styles.filtroGrupo}>
                    <label htmlFor="apellidoSearch">Apellido:</label>
                    <input
                        type="text"
                        id="apellidoSearch"
                        placeholder="Buscar por Apellido..."
                        value={inputApellido}
                        onChange={(e) => setInputApellido(e.target.value)}
                        className={styles.filtroInput}
                    />
                </div>

                {/* Filtro Username */}
                <div className={styles.filtroGrupo}>
                    <label htmlFor="userSearch">Usuario:</label>
                    <input
                        type="text"
                        id="userSearch"
                        placeholder="Nombre de Usuario..."
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        className={styles.filtroInput}
                    />
                </div>

                {/* Filtro Rol (Botones) */}
                <div className={styles.filtroGrupo}>
                    <label>Rol:</label>
                    <div className={styles.botonesFiltroEstado}>
                        {ROLES_FILTRO.map(rol => (
                            <button
                                key={rol.value}
                                type="button"
                                className={`${styles.botonFiltro} ${inputRol === rol.value ? styles.activo : ''}`}
                                onClick={() => setInputRol(rol.value)}
                            >
                                {rol.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className={styles.filtroAcciones}>
                    <button className={styles.botonLimpiar} onClick={handleLimpiarFiltros}>Limpiar</button>
                    <button className={styles.botonAplicar} onClick={handleAplicarFiltros}>Aplicar Filtros</button>
                </div>
            </div>

            {/* --- Vista de Tabla (Modificada) --- */}
            {/* Ya no hay 'initialView' ni 'showList' */}
            <div className={styles.tableContainer}>
                {loading && <p>Cargando...</p>}
                {error && <p className={styles.errorText}>{error}</p>}
                {!loading && !error && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Usuario</th>
                                <th>Rol</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmpleados.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center' }}>
                                        No se encontraron empleados con esos filtros.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmpleados.map(emp => (
                                    <tr key={emp.id}>
                                        <td>{emp.first_name} {emp.last_name}</td>
                                        <td>{emp.username}</td>
                                        <td>{emp.rol || 'No asignado'}</td>
                                        <td className={styles.actions}>
                                            <button 
                                                className={`${styles.actionButton} ${styles.editButton}`}
                                                onClick={() => handleEditClick(emp)}
                                            >
                                                Editar
                                            </button>
                                            {/* --- Botón Eliminar REMOVIDO (Goal 4) --- */}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* --- Modal de Edición (Modificado para nuevos handlers) --- */}
            {isEditModalOpen && (
                <EditEmployeeModal
                    employee={selectedEmployee}
                    onClose={handleModalClose}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
};

export default EmpleadoPage;