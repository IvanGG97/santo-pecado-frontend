import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Creamos una instancia de Axios con configuración base.
// Usar esta instancia en toda tu app asegura que todas las peticiones
// salgan desde el mismo lugar y con la misma configuración.
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- EL INTERCEPTOR DE PETICIONES ---
// Esta es la parte más importante. Se ejecuta ANTES de que cualquier
// petición sea enviada al servidor.
apiClient.interceptors.request.use(
    config => {
        // Log para depuración: Nos permite ver en la consola que el interceptor se está ejecutando.
        console.log("Interceptor: Se está ejecutando para la ruta:", config.url);
        
        // 1. Busca el token en el localStorage.
        const authToken = localStorage.getItem('authToken');
        
        // 2. Si encuentra el token...
        if (authToken) {
            // Lo convierte de string JSON a objeto y extrae el token de acceso.
            const token = JSON.parse(authToken).access;
            
            // Log para depuración: Confirma que encontró el token.
            console.log("Interceptor: Token encontrado. Adjuntando al header...");
            
            // 3. Lo añade a la cabecera 'Authorization' con el formato "Bearer".
            // El backend (usando simplejwt) sabe cómo leer esta cabecera.
            config.headers['Authorization'] = `Bearer ${token}`;
        } else {
            // Log para depuración: Nos avisa si no encontró el token.
            console.warn("Interceptor: No se encontró authToken en localStorage.");
        }
        
        // 4. Devuelve la configuración modificada para que la petición continúe.
        return config;
    },
    error => {
        // Maneja errores que puedan ocurrir durante la configuración de la petición.
        return Promise.reject(error);
    }
);

export default apiClient;





 