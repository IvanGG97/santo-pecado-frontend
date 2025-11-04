import React, { useState } from 'react';
import apiClient from '../../services/api';
import styles from './EmpleadoPage.module.css';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
// 1. Importamos el modal que creamos
import EditEmployeeModal from '../../components/EditEmployeeModal/EditEmployeeModal';

const MySwal = withReactContent(Swal);

const EmpleadoPage = () => {
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showList, setShowList] = useState(false);

    // 2. Activamos los estados para manejar el modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const fetchEmpleados = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/empleado/list/');
            setEmpleados(response.data);
        } catch (err) {
            setError('Error al cargar los empleados.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShowList = () => {
        setShowList(true);
        fetchEmpleados();
    };
    
    const handleDeleteClick = (employee) => {
        MySwal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará al empleado ${employee.first_name} ${employee.last_name}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiClient.delete(`/empleado/delete/${employee.id}/`);
                    MySwal.fire(
                        '¡Eliminado!',
                        'El empleado ha sido eliminado.',
                        'success'
                    );
                    fetchEmpleados(); 
                } catch (err) {
                    MySwal.fire(
                        'Error',
                        'No se pudo eliminar al empleado.',
                        'error'
                    );
                }
            }
        });
    };
    
    // 3. Activamos la función que abre el modal
    const handleEditClick = (employee) => {
        setSelectedEmployee(employee); // Guarda los datos del empleado seleccionado
        setIsEditModalOpen(true);     // Pone el estado en 'true' para mostrar el modal
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>EMPLEADOS / USUARIOS</h1>
            </header>

            {!showList ? (
                <div className={styles.initialView}>
                    <p>Gestiona los roles y la información de tus empleados.</p>
                    <button onClick={handleShowList} className={styles.actionButton}>
                        Ver Lista de Empleados
                    </button>
                </div>
            ) : (
                <div className={styles.tableView}>
                    {loading && <p>Cargando...</p>}
                    {error && <p className={styles.error}>{error}</p>}
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
                                {empleados.map(emp => (
                                    <tr key={emp.id}>
                                        <td>{emp.first_name} {emp.last_name}</td>
                                        <td>{emp.username}</td>
                                        <td>{emp.rol || 'No asignado'}</td>
                                        <td className={styles.actions}>
                                            <button 
                                                className={`${styles.actionButton} ${styles.editButton}`}
                                                onClick={() => handleEditClick(emp)} // Se asigna la función al botón
                                            >
                                                Editar
                                            </button>
                                            <button 
                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                onClick={() => handleDeleteClick(emp)}
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* 4. Activamos el renderizado del modal */}
            {/* Si isEditModalOpen es true, el modal se mostrará */}
            {isEditModalOpen && (
                <EditEmployeeModal
                    employee={selectedEmployee}
                    onClose={() => setIsEditModalOpen(false)} // Función para cerrar el modal
                    onSuccess={() => {
                        setIsEditModalOpen(false); // Cierra el modal
                        fetchEmpleados();          // Refresca la lista de empleados para ver los cambios
                    }}
                />
            )}
        </div>
    );
};

export default EmpleadoPage;

