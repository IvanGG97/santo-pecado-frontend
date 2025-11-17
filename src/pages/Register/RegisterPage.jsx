import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import Swal from 'sweetalert2';
import logo from '../../assets/images/logo.jpg';
import { Eye, EyeOff } from 'lucide-react'; // <-- 1. Importar iconos del "ojo"

export default function RegisterPage() {
    const { register, handleSubmit, formState: { errors, isValid }, watch } = useForm({ mode: 'onChange' });
    const { registerUser, loading } = useAuth();
    const navigate = useNavigate();
    const [apiError, setApiError] = useState('');

    // --- ESTADOS PARA VALIDACIONES Y UI ---

    // 2. Estados para visibilidad de contraseñas
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    // 3. Observamos campos para contadores y validación
    const password = watch("password", "");
    const username = watch("username", "");
    const firstName = watch("firstName", "");
    const lastName = watch("lastName", "");

    // 4. Lógica de requisitos de contraseña
    const passwordChecks = {
        hasSixChars: password.length >= 6,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const onSubmit = async (data) => {
        setApiError('');
        // El 'data' ya está validado por react-hook-form
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
                <img className={styles.img} src={logo} alt="santo pecado letras" />
            </div>
            <h2 className={`${styles.title} ${styles.neonText}`}>REGÍSTRATE AHORA</h2>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

                {/* --- USUARIO --- */}
                <label className={styles.label}>Usuario</label>
                <input
                    className={styles.input}
                    {...register("username", {
                        required: "El usuario es obligatorio",
                        maxLength: { value: 100, message: "El usuario no puede tener más de 100 caracteres" } // Goal 1
                    })}
                />
                {/* Contador de caracteres */}
                <small className={styles.charCounter}>{username.length} / 100</small>
                {errors.username && <p className={styles.error}>{errors.username.message}</p>}

                {/* --- NOMBRE --- */}
                <label className={styles.label}>Nombre</label>
                <input
                    className={styles.input}
                    {...register("firstName", {
                        required: "El nombre es obligatorio",
                        maxLength: { value: 100, message: "El nombre no puede tener más de 100 caracteres" } // Goal 2
                    })}
                />
                <small className={styles.charCounter}>{firstName.length} / 100</small>
                {errors.firstName && <p className={styles.error}>{errors.firstName.message}</p>}

                {/* --- APELLIDO --- */}
                <label className={styles.label}>Apellido</label>
                <input
                    className={styles.input}
                    {...register("lastName", {
                        required: "El apellido es obligatorio",
                        maxLength: { value: 100, message: "El apellido no puede tener más de 100 caracteres" } // Goal 3
                    })}
                />
                <small className={styles.charCounter}>{lastName.length} / 100</small>
                {errors.lastName && <p className={styles.error}>{errors.lastName.message}</p>}

                {/* --- DNI --- */}
                <label className={styles.label}>DNI</label>
                <input
                    className={styles.input}
                    type="text" // Usamos text para poder validar el maxLength
                    placeholder="Solo números, sin puntos"
                    {...register("dni", {
                        required: "El DNI es obligatorio",
                        pattern: { // Mi validación: solo números
                            value: /^[0-9]+$/,
                            message: "El DNI solo debe contener números"
                        },
                        minLength: { value: 7, message: "El DNI debe tener al menos 7 dígitos" },
                        maxLength: { value: 8, message: "El DNI no puede tener más de 8 dígitos" }, // Goal 6
                        validate: { // Goal 6
                            minNumber: v => parseInt(v, 10) > 5000000 || "El DNI debe ser un número válido"
                        }
                    })}
                />
                {errors.dni && <p className={styles.error}>{errors.dni.message}</p>}

                {/* --- TELÉFONO --- */}
                <label className={styles.label}>Teléfono</label>
                <input
                    className={styles.input}
                    type="tel"
                    placeholder="Ej: +54 9 387 1234567"
                    {...register("telefono", {
                        required: "El teléfono es obligatorio",
                        maxLength: { value: 15, message: "El teléfono no puede tener más de 15 caracteres" }, // Goal 4
                        pattern: { // Mi validación: números, +, y espacios
                            value: /^[0-9+\s]+$/,
                            message: "Número de teléfono no válido"
                        }
                    })}
                />
                {errors.telefono && <p className={styles.error}>{errors.telefono.message}</p>}

                {/* --- CORREO --- */}
                <label className={styles.label}>Correo</label>
                <input
                    className={styles.input}
                    type="email"
                    {...register("email", {
                        required: "El correo es obligatorio",
                        pattern: {
                            value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/, // Goal 5 (Regex robusta)
                            message: "Correo no válido (ej: usuario@dominio.com)"
                        }
                    })}
                    placeholder='Ej: usuario@dominio.com'
                />
                {errors.email && <p className={styles.error}>{errors.email.message}</p>}

                {/* --- CONTRASEÑA --- */}
                <label className={styles.label}>Contraseña</label>
                {/* Goal 7: Contenedor del "ojo" */}
                <div className={styles.passwordWrapper}>
                    <input
                        className={styles.input}
                        type={showPassword ? "text" : "password"} // Tipo dinámico
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
                    <button
                        type="button"
                        className={styles.passwordToggleIcon}
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                {errors.password && <p className={styles.error}>{errors.password.message}</p>}

                {isPasswordFocused && (
                    <div className={styles.passwordCriteria}>
                        <p className={passwordChecks.hasSixChars ? styles.valid : styles.invalid}>✓ Al menos 6 caracteres</p>
                        <p className={passwordChecks.hasUpperCase ? styles.valid : styles.invalid}>✓ Al menos una mayúscula</p>
                        <p className={passwordChecks.hasLowerCase ? styles.valid : styles.invalid}>✓ Al menos una minúscula</p>
                        <p className={passwordChecks.hasNumber ? styles.valid : styles.invalid}>✓ Al menos un número</p>
                        <p className={passwordChecks.hasSpecialChar ? styles.valid : styles.invalid}>✓ Al menos un carácter especial</p>
                    </div>
                )}

                {/* --- CONFIRMAR CONTRASEÑA --- */}
                <label className={styles.label}>Confirmar Contraseña</label>
                {/* Goal 7: Contenedor del "ojo" */}
                <div className={styles.passwordWrapper}>
                    <input
                        className={styles.input}
                        type={showConfirmPassword ? "text" : "password"} // Tipo dinámico
                        {...register("confirmPassword", {
                            required: "Debes confirmar la contraseña",
                            validate: value => value === password || "Las contraseñas no coinciden"
                        })}
                    />
                    <button
                        type="button"
                        className={styles.passwordToggleIcon}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
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