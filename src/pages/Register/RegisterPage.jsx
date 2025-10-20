import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import Swal from 'sweetalert2';

export default function RegisterPage() {
    const { register, handleSubmit, formState: { errors, isValid }, watch } = useForm({ mode: 'onChange' });
    const { registerUser, loading } = useAuth();
    const navigate = useNavigate();
    const [apiError, setApiError] = useState('');
    
    // 1. Estado para controlar la visibilidad de los requisitos de la contraseña
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    // Observamos el valor del campo de la contraseña en tiempo real
    const password = watch("password", "");

    // 2. Objeto con la lógica para validar cada requisito de la contraseña
    const passwordChecks = {
        hasSixChars: password.length >= 6,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const onSubmit = async (data) => {
        setApiError('');
        const userData = {
            username: data.username,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            password: data.password,
            dni: data.dni,
            telefono: data.telefono,
        };

        const result = await registerUser(userData);

        if (result.success) {
            Swal.fire({
                title: '¡Registro casi completo!',
                text: 'Hemos enviado un enlace de activación a tu correo electrónico. Por favor, revísalo para continuar.',
                icon: 'success',
                confirmButtonText: 'Entendido'
            }).then(() => {
                navigate('/login');
            });
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
                <label className={styles.label}>Usuario</label>
                <input className={styles.input} {...register("username", { required: "El usuario es obligatorio" })} />
                {errors.username && <p className={styles.error}>{errors.username.message}</p>}

                <label className={styles.label}>Nombre</label>
                <input className={styles.input} {...register("firstName", { required: "El nombre es obligatorio" })} />
                {errors.firstName && <p className={styles.error}>{errors.firstName.message}</p>}
                
                <label className={styles.label}>Apellido</label>
                <input className={styles.input} {...register("lastName", { required: "El apellido es obligatorio" })} />
                {errors.lastName && <p className={styles.error}>{errors.lastName.message}</p>}

                <label className={styles.label}>DNI</label>
                <input 
                    className={styles.input}
                    type="text"
                    placeholder="Documento Nacional de Identidad"
                    {...register("dni")} 
                />
                
                <label className={styles.label}>Teléfono</label>
                <input 
                    className={styles.input}
                    type="tel"
                    placeholder="Número de teléfono"
                    {...register("telefono")} 
                />

                <label className={styles.label}>Correo</label>
                <input
                    className={styles.input}
                    type="email"
                    {...register("email", { 
                        required: "El correo es obligatorio",
                        pattern: {
                            value: /^\S+@\S+\.\S+$/,
                            message: "Correo no válido"
                        }
                    })}
                />
                {errors.email && <p className={styles.error}>{errors.email.message}</p>}

                <label className={styles.label}>Contraseña</label>
                <input
                    className={styles.input}
                    type="password"
                    // 3. Actualizamos la validación y añadimos el evento onFocus
                    {...register("password", { 
                        required: "La contraseña es obligatoria",
                        validate: {
                            hasSixChars: v => v.length >= 6 || "Debe tener al menos 6 caracteres",
                            hasUpperCase: v => /[A-Z]/.test(v) || "Debe contener al menos una mayúscula",
                            hasLowerCase: v => /[a-z]/.test(v) || "Debe contener al menos una minúscula",
                            hasNumber: v => /\d/.test(v) || "Debe contener al menos un número",
                            hasSpecialChar: v => /[!@#$%^&*(),.?":{}|<>]/.test(v) || "Debe contener al menos un caracter especial",
                        }
                    })}
                    onFocus={() => setIsPasswordFocused(true)}
                />
                {/* Mostramos el primer error de validación que encuentre react-hook-form */}
                {errors.password && <p className={styles.error}>{errors.password.message}</p>}

                {/* 4. Lista de requisitos que aparece al hacer focus */}
                {isPasswordFocused && (
                    <div className={styles.passwordCriteria}>
                        <p className={passwordChecks.hasSixChars ? styles.valid : styles.invalid}>✓ Al menos 6 caracteres</p>
                        <p className={passwordChecks.hasUpperCase ? styles.valid : styles.invalid}>✓ Al menos una mayúscula</p>
                        <p className={passwordChecks.hasLowerCase ? styles.valid : styles.invalid}>✓ Al menos una minúscula</p>
                        <p className={passwordChecks.hasNumber ? styles.valid : styles.invalid}>✓ Al menos un número</p>
                        <p className={passwordChecks.hasSpecialChar ? styles.valid : styles.invalid}>✓ Al menos un carácter especial</p>
                    </div>
                )}

                <label className={styles.label}>Confirmar Contraseña</label>
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
                    className={`${styles.button} ${!isValid || loading ? styles.buttonDisabled : ''}`}
                    disabled={!isValid || loading}
                >
                    {loading ? 'Registrando...' : 'Registrarse'}
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

