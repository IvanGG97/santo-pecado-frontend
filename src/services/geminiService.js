// src/services/geminiService.js
import apiClient from './api';

// La clave de Gemini queda en el backend: el navegador solo manda los datos del dashboard.
export const generateDashboardReport = async (datos) => {
    const response = await apiClient.post('/venta/reporte-ia/', datos);
    return response.data.reporte;
};
