import React, { useState } from 'react';
import Login from '../Login/Login';
import Register from '../Register/Register';
import styles from './AuthContainer.module.css';

const AuthContainer = () => {
    const [isLogin, setIsLogin] = useState(true);

    const toggleMode = () => {
        setIsLogin(!isLogin);
    };

    return (
        <div className={styles.authContainer}>
            {isLogin ? (
                <Login onToggleMode={toggleMode} />
            ) : (
                <Register onToggleMode={toggleMode} />
            )}
        </div>
    );
};

export default AuthContainer;