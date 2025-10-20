import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import apiClient from '../../services/api';
import Swal from 'sweetalert2';
import styles from './ResetPasswordPage.module.css';

const ResetPasswordPage = () => {
    const { register, handleSubmit, formState: { errors, isValid }, watch } = useForm({ mode: 'onChange' });
    const { uidb64, token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    // Observamos el valor de la contraseña en tiempo real
    const password = watch("password", "");

    // Objeto para verificar los requisitos de la contraseña
    const passwordChecks = {
        hasSixChars: password.length >= 6,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setApiError('');
        try {
            const payload = { uidb64, token, password: data.password };
            await apiClient.post('/empleado/password-reset-confirm/', payload);
            
            Swal.fire({
                title: '¡Contraseña Actualizada!',
                text: 'Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión.',
                icon: 'success'
            }).then(() => {
                navigate('/login');
            });

        } catch (err) {
            setApiError(err.response?.data?.detail || 'El enlace es inválido o ha expirado. Por favor, solicita uno nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.containerImg}>
                <img className={styles.img} src="https://i.imgur.com/w8KqDWP.jpeg" alt="santo pecado letras" />
            </div>
            <h2 className={`${styles.title} ${styles.neonText}`}>RESTABLECER CONTRASEÑA</h2>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <label className={styles.label}>Nueva Contraseña</label>
                <input
                    className={styles.input}
                    type="password"
                    onFocus={() => setIsPasswordFocused(true)}
                    {...register("password", { 
                        required: "La contraseña es obligatoria",
                        validate: {
                            hasSixChars: v => v.length >= 6 || "Debe tener al menos 6 caracteres",
                            hasUpperCase: v => /[A-Z]/.test(v) || "Debe contener una mayúscula",
                            hasLowerCase: v => /[a-z]/.test(v) || "Debe contener una minúscula",
                            hasNumber: v => /\d/.test(v) || "Debe contener un número",
                            hasSpecialChar: v => /[!@#$%^&*(),.?":{}|<>]/.test(v) || "Debe contener un caracter especial",
                        }
                    })}
                />
                {/* Muestra el primer error de validación que encuentra react-hook-form */}
                {errors.password && <p className={styles.error}>{errors.password.message}</p>}

                {/* Lista de requisitos que aparece al hacer focus */}
                {isPasswordFocused && (
                    <div className={styles.passwordCriteria}>
                        <p className={passwordChecks.hasSixChars ? styles.valid : styles.invalid}>✓ Al menos 6 caracteres</p>
                        <p className={passwordChecks.hasUpperCase ? styles.valid : styles.invalid}>✓ Al menos una mayúscula</p>
                        <p className={passwordChecks.hasLowerCase ? styles.valid : styles.invalid}>✓ Al menos una minúscula</p>
                        <p className={passwordChecks.hasNumber ? styles.valid : styles.invalid}>✓ Al menos un número</p>
                        <p className={passwordChecks.hasSpecialChar ? styles.valid : styles.invalid}>✓ Al menos un carácter especial</p>
                    </div>
                )}
                
                <label className={styles.label}>Confirmar Nueva Contraseña</label>
                <input
                    className={styles.input}
                    type="password"
                    {...register("confirmPassword", {
                        validate: value => value === password || "Las contraseñas no coinciden"
                    })}
                />
                {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword.message}</p>}

                {apiError && <p className={styles.error}>{apiError}</p>}
                
                <button
                    type="submit"
                    className={styles.button}
                    disabled={!isValid || loading}
                >
                    {loading ? 'Guardando...' : 'Guardar Contraseña'}
                </button>
            </form>

            <p className={styles.switchText}>
                <Link to="/login" className={styles.linkButton}>
                    Volver a Iniciar Sesión
                </Link>
            </p>
        </div>
    );
};

export default ResetPasswordPage;

