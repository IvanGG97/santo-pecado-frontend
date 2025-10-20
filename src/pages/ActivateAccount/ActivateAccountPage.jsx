import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';
import styles from './ActivateAccountPage.module.css';

const ActivateAccountPage = () => {
    const { uidb64, token } = useParams();
    const [status, setStatus] = useState('activating'); // 'activating', 'success', 'error'
    const [message, setMessage] = useState('Activando tu cuenta, por favor espera...');

    useEffect(() => {
        if (uidb64 && token) {
            apiClient.get(`/empleado/activate/${uidb64}/${token}/`)
                .then(response => {
                    setStatus('success');
                    setMessage(response.data.detail);
                })
                .catch(error => {
                    setStatus('error');
                    setMessage(error.response?.data?.detail || 'Ocurrió un error inesperado.');
                });
        }
    }, [uidb64, token]);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {status === 'activating' && <div className={styles.loader}></div>}
                
                <h1 className={styles[status]}>{message}</h1>

                {status === 'success' && (
                    <Link to="/login" className={styles.loginButton}>
                        Ir a Iniciar Sesión
                    </Link>
                )}
                 {status === 'error' && (
                    <p>Por favor, intenta registrarte de nuevo o contacta al soporte.</p>
                )}
            </div>
        </div>
    );
};

export default ActivateAccountPage;
