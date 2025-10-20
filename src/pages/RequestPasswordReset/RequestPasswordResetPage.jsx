import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './RequestPasswordResetPage.module.css';
import Swal from 'sweetalert2';
import apiClient from '../../services/api'; // Lo activamos para usarlo

const RequestPasswordResetPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Hacemos la llamada real al endpoint del backend
            await apiClient.post('/empleado/password-reset/', { email });
            
            Swal.fire({
                title: '¡Correo Enviado!',
                text: 'Si existe una cuenta asociada a este correo, recibirás un enlace para recuperar tu contraseña.',
                icon: 'success'
            }).then(() => {
                navigate('/login'); // Redirigimos al login después de la notificación
            });

        } catch (err) {
            // El mensaje de error genérico es una buena práctica de seguridad
            setError('Ocurrió un error. Por favor, intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.containerImg}>
                <img className={styles.img} src="https://i.imgur.com/w8KqDWP.jpeg" alt="santo pecado letras" />
            </div>
            <h2 className={`${styles.title} ${styles.neonText}`}>RECUPERAR CONTRASEÑA</h2>
            <p className={styles.instructions}>
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit}>
                <label className={styles.label}>Correo Electrónico</label>
                <input
                    className={styles.input}
                    type="email"
                    placeholder="tu-correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                
                {error && <p className={styles.error}>{error}</p>}

                <button
                    type="submit"
                    className={styles.button}
                    disabled={loading}
                >
                    {loading ? 'Enviando...' : 'Enviar Enlace'}
                </button>
            </form>

            <p className={styles.switchText}>
                ¿Recordaste tu contraseña?{' '}
                <Link to="/login" className={styles.linkButton}>
                    Volver a Iniciar Sesión
                </Link>
            </p>
        </div>
    );
};

export default RequestPasswordResetPage;

