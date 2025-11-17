import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import styles from './LoginPage.module.css'; 
import { Eye, EyeOff } from 'lucide-react'; // 1. IMPORTAMOS LOS ICONOS
import logo from '../../assets/images/logo.jpg';

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors, isValid } } = useForm({ mode: 'onChange' });
    const { loginUser, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [apiError, setApiError] = useState('');

    // --- 2. AÑADIMOS EL ESTADO PARA VISIBILIDAD ---
    const [showPassword, setShowPassword] = useState(false);

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

    // --- 3. FUNCIÓN PARA CAMBIAR LA VISIBILIDAD ---
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className={styles.container}>
            <div className={styles.containerImg}>
                <img className={styles.img} src={logo} alt="santo pecado letras" />
            </div>
            <h2 className={`${styles.title} ${styles.neonText}`}>INICIAR SESIÓN</h2>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.loginForm}>
                <label className={styles.label}>Usuario</label>
                <input
                    className={styles.input} type="text" placeholder="Tu nombre de usuario"
                    {...register("username", { required: "El usuario es obligatorio" })}
                    disabled={loading} 
                />
                {errors.username && <p className={styles.error}>{errors.username.message}</p>}

                <label className={styles.label}>Contraseña</label>

                {/* --- 4. SECCIÓN DE CONTRASEÑA MODIFICADA --- */}
                <div className={styles.passwordWrapper}>
                    <input
                        className={styles.input} 
                        // El tipo ahora es dinámico
                        type={showPassword ? "text" : "password"} 
                        placeholder="Tu contraseña"
                        {...register("password", { required: "La contraseña es obligatoria" })}
                        disabled={loading} 
                    />
                    {/* Botón para cambiar visibilidad */}
                    <button 
                        type="button" 
                        className={styles.passwordToggleIcon} 
                        onClick={togglePasswordVisibility}
                        tabIndex="-1" // Evita que el botón sea enfocable con Tab
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                {/* --- FIN DE LA MODIFICACIÓN --- */}

                {errors.password && <p className={styles.error}>{errors.password.message}</p>}

                <div className={styles.forgotPassword}>
                    <Link to="/recuperar-contrasena" className={styles.linkButton}>
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                {apiError && <p className={styles.error}>{apiError}</p>}

                <button
                    type="submit"
                    className={`${styles.button} ${(!isValid || loading) ? styles.buttonDisabled : ''}`}
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