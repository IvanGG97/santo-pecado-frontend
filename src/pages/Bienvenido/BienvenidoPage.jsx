import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BienvenidoPage.module.css';
import { PartyPopper, ArrowRight } from 'lucide-react';

const BienvenidoPage = () => {
    const navigate = useNavigate();

    // Marcamos que el usuario ya vio esta página
    useEffect(() => {
        localStorage.setItem('bienvenidaVista', 'true');
    }, []);

    const irALaCarta = () => {
        navigate('/carta', { replace: true });
    };

    return (
        <div className={styles.bienvenidoContainer}>
            <div className={styles.bienvenidoBox}>
                <PartyPopper size={64} className={styles.icon} />
                <h1 className={styles.title}>¡Bienvenido a Santo Pecado!</h1>
                <p className={styles.subtitle}>
                    Gracias por registrarte y activar tu cuenta.
                </p>
                <p className={styles.message}>
                    Ahora puedes explorar nuestra carta digital, ver nuestros productos
                    y promociones exclusivas.
                </p>
                <button className={styles.ctaButton} onClick={irALaCarta}>
                    <span>Ver la Carta</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default BienvenidoPage;
