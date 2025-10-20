import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    // Eliminamos el header 'Content-Type' por defecto.
    // Axios es lo suficientemente inteligente como para establecer el
    // 'Content-Type' correcto ('application/json' o 'multipart/form-data')
    // según los datos que se envían.
});

// El interceptor para añadir el token de autorización se queda igual.
apiClient.interceptors.request.use(
    config => {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            const token = JSON.parse(authToken).access;
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

export default apiClient;

