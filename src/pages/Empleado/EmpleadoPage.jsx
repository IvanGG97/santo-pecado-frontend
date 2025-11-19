import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../services/api';
import styles from './EmpleadoPage.module.css'; 
import Swal from 'sweetalert2';
import EditEmployeeModal from '../../components/EditEmployeeModal/EditEmployeeModal';
// 1. Importamos useAuth
import { useAuth } from '../../contexts/AuthContext'; 

// --- Constantes para Filtros ---
const ROLES_FILTRO = [
    { value: 'todos', label: 'Todos' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Encargado/Cajero', label: 'Encargado/Cajero' },
    { value: 'Cocina', label: 'Cocina' },
    { value: 'Cliente', label: 'Cliente'}
];

const ROLES_PRIORITARIOS = {
    'Admin': 1,
    'Encargado/Cajero': 2,
    'Cocina': 3
};

const EmpleadoPage = () => {
    // 2. Obtenemos el usuario logueado
    const { user } = useAuth(); 
    
    const [allEmpleados, setAllEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // --- Estados para Filtros ---
    const [inputNombre, setInputNombre] = useState('');
    const [inputApellido, setInputApellido] = useState('');
    const [inputUsername, setInputUsername] = useState('');
    const [inputRol, setInputRol] = useState('todos');

    const [activeFilters, setActiveFilters] = useState({
        nombre: '',
        apellido: '',
        username: '',
        rol: 'todos',
    });

    // --- Carga de Datos ---
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

    useEffect(() => {
        fetchEmpleados();
    }, [fetchEmpleados]);

    // --- 3. Separar Usuario Actual y Lista Filtrada ---
    const { currentUserEmployee, otherEmployeesFiltered } = useMemo(() => {
        if (!user) return { currentUserEmployee: null, otherEmployeesFiltered: [] };

        // Encontrar al usuario actual en la lista de empleados (por username o ID)
        // Asumiendo que 'user.username' del AuthContext coincide con 'emp.username'
        const current = allEmpleados.find(emp => emp.username === user.username);
        
        // Filtrar el resto
        const others = allEmpleados.filter(emp => emp.username !== user.username);

        // Aplicar filtros SOLO a los "otros"
        const termNombre = activeFilters.nombre.toLowerCase().trim();
        const termApellido = activeFilters.apellido.toLowerCase().trim();
        const termUsername = activeFilters.username.toLowerCase().trim();
        const termRol = activeFilters.rol;

        const filtered = others.filter(emp => {
            const nombreCompleto = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase().trim();

            if (termNombre && !nombreCompleto.includes(termNombre)) return false;
            if (termApellido && !nombreCompleto.includes(termApellido)) return false;
            if (termUsername && !(emp.username || '').toLowerCase().includes(termUsername)) return false;
            if (termRol !== 'todos' && (emp.rol || 'No asignado') !== termRol) return false;
            
            return true;
        }).sort((a, b) => {
            const priorityA = ROLES_PRIORITARIOS[a.rol] || 99;
            const priorityB = ROLES_PRIORITARIOS[b.rol] || 99;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return (a.first_name || '').localeCompare(b.first_name || '');
        });

        return { currentUserEmployee: current, otherEmployeesFiltered: filtered };

    }, [allEmpleados, activeFilters, user]);


    // --- Handlers ---
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
        fetchEmpleados(); 
    };


    return (
        <div className={styles.container}>
            <h1>Gestión de Empleados</h1>

            {/* --- 4. SECCIÓN USUARIO ACTUAL (Perfil Propio) --- */}
            {currentUserEmployee && (
                <div className={styles.currentUserSection}>
                    <h3>Mi Perfil</h3>
                    <div className={styles.currentUserCard}>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>
                                {currentUserEmployee.first_name} {currentUserEmployee.last_name} 
                                <span className={styles.meBadge}>(Tú)</span>
                            </span>
                            <span className={styles.userUsername}>@{currentUserEmployee.username}</span>
                            <span className={`${styles.userRole} ${styles[currentUserEmployee.rol?.replace('/','_') || 'default']}`}>
                                {currentUserEmployee.rol || 'Sin Rol'}
                            </span>
                        </div>
                        <div className={styles.userActions}>
                            <button 
                                className={`${styles.actionButton} ${styles.editButton}`}
                                onClick={() => handleEditClick(currentUserEmployee)}
                            >
                                Editar Mis Datos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BARRA DE FILTROS --- */}
            <div className={styles.filtrosContainer}>
                {/* ... (Inputs de filtro Nombre, Apellido, Usuario - IGUAL QUE ANTES) ... */}
                <div className={styles.filtroGrupo}>
                    <label htmlFor="nombreSearch">Nombre:</label>
                    <input type="text" id="nombreSearch" placeholder="Buscar..." value={inputNombre} onChange={(e) => setInputNombre(e.target.value)} className={styles.filtroInput} />
                </div>
                <div className={styles.filtroGrupo}>
                    <label htmlFor="apellidoSearch">Apellido:</label>
                    <input type="text" id="apellidoSearch" placeholder="Buscar..." value={inputApellido} onChange={(e) => setInputApellido(e.target.value)} className={styles.filtroInput} />
                </div>
                <div className={styles.filtroGrupo}>
                    <label htmlFor="userSearch">Usuario:</label>
                    <input type="text" id="userSearch" placeholder="Buscar..." value={inputUsername} onChange={(e) => setInputUsername(e.target.value)} className={styles.filtroInput} />
                </div>
                
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

                <div className={styles.filtroAcciones}>
                    <button className={styles.botonLimpiar} onClick={handleLimpiarFiltros}>Limpiar</button>
                    <button className={styles.botonAplicar} onClick={handleAplicarFiltros}>Aplicar Filtros</button>
                </div>
            </div>

            {/* --- TABLA DE OTROS EMPLEADOS --- */}
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
                            {otherEmployeesFiltered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center' }}>
                                        No se encontraron otros empleados con esos filtros.
                                    </td>
                                </tr>
                            ) : (
                                otherEmployeesFiltered.map(emp => (
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

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