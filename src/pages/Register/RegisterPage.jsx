import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RegisterPage.module.css'; 
import { useState } from 'react';


export default function RegisterPage() {
    const { register, handleSubmit, formState: { errors, isValid }, watch } = useForm({ mode: 'onChange' });
    const { registerUser, loading } = useAuth();
    const navigate = useNavigate();
    const [apiError, setApiError] = useState('');

    const password = watch("password", ""); // Para la validación de confirmar contraseña

    const onSubmit = async (data) => {
        setApiError('');
        const userData = {
            username: data.username,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            password: data.password
        };

        const result = await registerUser(userData);

        if (result.success) {
            alert('Registro exitoso. Serás redirigido al login para que inicies sesión una vez que un administrador apruebe tu cuenta.');
            navigate('/login');
        } else {
            setApiError(result.error);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.containerImg}>
                <img className={styles.img} src="https://i.imgur.com/w8KqDWP.jpeg" alt="santo pecado letras" />
            </div>
            <h2 className={`${styles.title} ${styles.neonText}`}>REGÍSTRATE AHORA</h2>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Campo Usuario */}
                <label className={styles.label}>Usuario</label>
                <input
                    className={styles.input}
                    type="text"
                    placeholder="Ingrese su usuario"
                    {...register("username", { required: "El usuario es obligatorio" })}
                />
                {errors.username && <p className={styles.error}>{errors.username.message}</p>}

                {/* Campo Nombre */}
                <label className={styles.label}>Nombre</label>
                <input
                    className={styles.input}
                    type="text"
                    placeholder="Ingrese su nombre"
                    {...register("firstName", { required: "El nombre es obligatorio" })}
                />
                {errors.firstName && <p className={styles.error}>{errors.firstName.message}</p>}
                
                {/* Campo Apellido */}
                <label className={styles.label}>Apellido</label>
                <input
                    className={styles.input}
                    type="text"
                    placeholder="Ingrese su apellido"
                    {...register("lastName", { required: "El apellido es obligatorio" })}
                />
                {errors.lastName && <p className={styles.error}>{errors.lastName.message}</p>}

                {/* Campo Correo */}
                <label className={styles.label}>Correo</label>
                <input
                    className={styles.input}
                    type="email"
                    placeholder="Ingrese su correo"
                    {...register("email", { 
                        required: "El correo es obligatorio",
                        pattern: {
                            value: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                            message: "Correo no válido"
                        }
                    })}
                />
                {errors.email && <p className={styles.error}>{errors.email.message}</p>}

                {/* Campo Contraseña */}
                <label className={styles.label}>Contraseña</label>
                <input
                    className={styles.input}
                    type="password"
                    placeholder="Ingrese su contraseña"
                    {...register("password", { 
                        required: "La contraseña es obligatoria",
                        minLength: { value: 6, message: "La contraseña debe tener al menos 6 caracteres" }
                    })}
                />
                {errors.password && <p className={styles.error}>{errors.password.message}</p>}

                {/* Campo Confirmar Contraseña */}
                <label className={styles.label}>Confirmar Contraseña</label>
                <input
                    className={styles.input}
                    type="password"
                    placeholder="Confirme su contraseña"
                    {...register("confirmPassword", {
                        required: "Confirma tu contraseña",
                        validate: value => value === password || "Las contraseñas no coinciden"
                    })}
                />
                {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword.message}</p>}

                {apiError && <p className={styles.error}>{apiError}</p>}

                <button
                    type="submit"
                    className={`${styles.button} ${!isValid || loading ? styles.buttonDisabled : ''}`}
                    disabled={!isValid || loading}
                >
                    {loading ? 'Cargando...' : 'Registrarse'}
                </button>
            </form>

            <p className={styles.switchText}>
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className={styles.linkButton}>
                    Inicia sesión
                </Link>
            </p>
        </div>
    );
}
