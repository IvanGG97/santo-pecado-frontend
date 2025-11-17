// src/services/geminiService.js

const GEMINI_API_KEY = "AIzaSyDIlOdtB2RDVx1i1lu-9E_bInUhTct0Ns8"; // ⚠️ Reemplázala con tu Key real o usa process.env.REACT_APP_GEMINI_KEY

export const generateDashboardReport = async (datos) => {
    const { ventasTotales, topProductos, stockBajo, topDias, mediosPago } = datos;

    // Construimos un prompt estructurado con los datos JSON
    const prompt = `
        Actúa como un experto consultor de negocios gastronómicos y data analyst. 
        Analiza los siguientes datos de mi restaurante "Santo Pecado" correspondientes al último periodo filtrado:

        1. DATOS GENERALES:
        - Ventas totales analizadas (cantidad de transacciones): ${ventasTotales}

        2. TOP PRODUCTOS MÁS VENDIDOS:
        ${JSON.stringify(topProductos)}

        3. INGRESOS POR DÍA (MEJORES DÍAS):
        ${JSON.stringify(topDias)}

        4. PREFERENCIA DE PAGO:
        ${JSON.stringify(mediosPago)}

        5. ALERTAS DE STOCK (CRÍTICO):
        ${JSON.stringify(stockBajo)}

        ---
        TAREA:
        Genera un "Informe Estratégico de Desempeño".
        El formato debe ser texto plano pero bien estructurado con los siguientes puntos:
        
        1. **Resumen Ejecutivo**: Una visión general breve del estado del negocio.
        2. **Análisis de Tendencias**: ¿Qué productos lideran? ¿Qué días son los más fuertes?
        3. **Alertas de Inventario**: Recomendaciones urgentes sobre el stock bajo.
        4. **3 Recomendaciones Estratégicas**: Acciones concretas para aumentar ventas o mejorar eficiencia basadas en estos datos.
        
        Usa un tono profesional, motivador y directo. No uses formato Markdown (negritas, etc), usa texto plano para que pueda imprimirse en PDF fácilmente.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }),
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error("Error conectando con Gemini:", error);
        throw error;
    }
};