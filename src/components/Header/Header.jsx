import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import styles from './Header.module.css';

const MySwal = withReactContent(Swal);

const Header = () => {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        MySwal.fire({
            title: '¿Confirmas el cierre de sesión?',
            text: "Serás redirigido a la página de login.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                logoutUser();
                navigate('/login');
            }
        });
    };

    return (
        <header className={styles.header}>
            <div className={styles.userInfo}>
                Bienvenido, <strong>{user?.first_name || user?.username}</strong>
            </div>
            <button onClick={handleLogout} className={styles.logoutButton}>
                Cerrar Sesión
            </button>
        </header>
    );
};

export default Header;
