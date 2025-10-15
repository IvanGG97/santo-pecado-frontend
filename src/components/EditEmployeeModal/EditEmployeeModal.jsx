import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '../../services/api';
import styles from './EditEmployeeModal.module.css';
import Swal from 'sweetalert2';

const EditEmployeeModal = ({ employee, onClose, onSuccess }) => {
    const { register, handleSubmit, formState: { errors }, setValue } = useForm({
        // Valores por defecto para el formulario tomados del empleado seleccionado
        defaultValues: {
            first_name: employee?.first_name,
            last_name: employee?.last_name,
            dni: employee?.dni,
            telefono: employee?.telefono,
        }
    });
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);

    // Al cargar el modal, pedimos la lista de roles disponibles al backend
    useEffect(() => {
        apiClient.get('/empleado/roles/')
            .then(response => {
                setRoles(response.data);
                // Buscamos el ID del rol actual del empleado para pre-seleccionarlo en el <select>
                const employeeRole = response.data.find(r => r.name === employee.rol);
                if (employeeRole) {
                    setValue('rol', employeeRole.id);
                }
            })
            .catch(error => console.error("Error al obtener los roles", error));
    }, [employee, setValue]);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const payload = {
                first_name: data.first_name,
                last_name: data.last_name,
                dni: data.dni,
                telefono: data.telefono,
                // Si el rol no se selecciona (value es ''), se envía null al backend
                rol: data.rol ? parseInt(data.rol) : null
            };

            // Usamos el ID del perfil de empleado (`empleado_id`) para la URL de actualización
            await apiClient.put(`/empleado/update/${employee.empleado_id}/`, payload);
            
            Swal.fire('¡Actualizado!', 'La información del empleado ha sido actualizada.', 'success');
            onSuccess(); // Llama a la función del padre para refrescar la lista de empleados
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar el empleado.', 'error');
            console.error("Error en la actualización:", error.response?.data || error);
        } finally {
            setLoading(false);
            onClose(); // Cierra el modal, haya éxito o no
        }
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <h2>Editar Empleado: {employee.username}</h2>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className={styles.formGroup}>
                        <label>Nombre</label>
                        <input {...register("first_name", { required: "El nombre es obligatorio" })} />
                        {errors.first_name && <p className={styles.error}>{errors.first_name.message}</p>}
                    </div>
                    <div className={styles.formGroup}>
                        <label>Apellido</label>
                        <input {...register("last_name", { required: "El apellido es obligatorio" })} />
                        {errors.last_name && <p className={styles.error}>{errors.last_name.message}</p>}
                    </div>
                     <div className={styles.formGroup}>
                        <label>DNI</label>
                        <input {...register("dni")} />
                    </div>
                     <div className={styles.formGroup}>
                        <label>Teléfono</label>
                        <input {...register("telefono")} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Rol</label>
                        <select {...register("rol")}>
                            <option value="">-- Sin Rol --</option>
                            {roles.map(rol => (
                                <option key={rol.id} value={rol.id}>{rol.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.buttons}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                        <button type="submit" disabled={loading} className={styles.saveButton}>
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEmployeeModal;

