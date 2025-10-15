import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import styles from './LoginPage.module.css'; 

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors, isValid } } = useForm({ mode: 'onChange' });
    const { loginUser, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [apiError, setApiError] = useState('');

    // Averiguamos a dónde redirigir al usuario después del login
    const from = location.state?.from?.pathname || "/inicio";

    const onSubmit = async (data) => {
        setApiError('');
        const result = await loginUser(data.username, data.password);

        if (result.success) {
            navigate(from, { replace: true });
        } else {
            setApiError(result.error);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.containerImg}>
                <img className={styles.img} src="https://i.imgur.com/w8KqDWP.jpeg" alt="santo pecado letras" />
            </div>
            <h2 className={`${styles.title} ${styles.neonText}`}>INICIAR SESIÓN</h2>

            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Campo Usuario */}
                <label className={styles.label}>Usuario</label>
                <input
                    className={styles.input}
                    type="text"
                    placeholder="Tu nombre de usuario"
                    {...register("username", { required: "El usuario es obligatorio" })}
                />
                {errors.username && <p className={styles.error}>{errors.username.message}</p>}

                {/* Campo Contraseña */}
                <label className={styles.label}>Contraseña</label>
                <input
                    className={styles.input}
                    type="password"
                    placeholder="Tu contraseña"
                    {...register("password", { required: "La contraseña es obligatoria" })}
                />
                {errors.password && <p className={styles.error}>{errors.password.message}</p>}

                {apiError && <p className={styles.error}>{apiError}</p>}

                <button
                    type="submit"
                    className={`${styles.button} ${!isValid || loading ? styles.buttonDisabled : ''}`}
                    disabled={!isValid || loading}
                >
                    {loading ? 'Ingresando...' : 'Entrar'}
                </button>
            </form>

            <p className={styles.switchText}>
                ¿Aún no tienes cuenta?{' '}
                <Link to="/register" className={styles.linkButton}>
                    Regístrate
                </Link>
            </p>
        </div>
    );
}
