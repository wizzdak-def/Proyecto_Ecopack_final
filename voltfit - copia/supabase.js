/**
 * ============================================================
 * supabase.js – VoltFit | JA Infinity
 * Módulo de integración con Supabase (REST API nativa)
 * Sin dependencias externas – JavaScript puro
 * ============================================================
 */

// ──────────────────────────────────────────────
// CONFIGURACIÓN – Reemplaza con tus credenciales
// ──────────────────────────────────────────────
const SUPABASE_URL = "https://TU_PROJECT_ID.supabase.co";
const SUPABASE_KEY = "TU_ANON_PUBLIC_KEY";

/**
 * Cabeceras base para todas las peticiones a Supabase
 */
const BASE_HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=minimal"
};

// ──────────────────────────────────────────────
// FUNCIÓN: Enviar lead a Supabase
// ──────────────────────────────────────────────
/**
 * Inserta un lead en la tabla `leads` de Supabase.
 *
 * @param {Object} leadData - Datos del lead a insertar
 * @param {string} leadData.nombre_completo
 * @param {string} leadData.correo
 * @param {string} [leadData.telefono]
 * @param {string} [leadData.ubicacion]
 * @param {string} leadData.tipo_cliente
 * @param {string} leadData.nivel_interes
 * @param {number} leadData.prioridad       - Calculado por lead-scoring.js
 * @param {string|null} [leadData.producto_id]  - UUID del producto en Supabase
 * @param {boolean} leadData.acepta_privacidad
 *
 * @returns {Promise<{ success: boolean, error: string|null }>}
 */
async function submitLead(leadData) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify(leadData)
    });

    // 201 Created = éxito
    if (response.status === 201 || response.ok) {
      return { success: true, error: null };
    }

    // Intentar leer el error de Supabase
    let errorMsg = `Error ${response.status}`;
    try {
      const errBody = await response.json();
      errorMsg = errBody.message || errBody.error || errorMsg;
    } catch (_) { /* sin cuerpo JSON */ }

    return { success: false, error: errorMsg };

  } catch (networkError) {
    // Error de red o CORS
    return {
      success: false,
      error: "Error de conexión. Verifica tu acceso a internet."
    };
  }
}

// ──────────────────────────────────────────────
// FUNCIÓN: Obtener productos activos desde Supabase
// ──────────────────────────────────────────────
/**
 * Obtiene la lista de productos activos desde Supabase.
 * Usado para poblar el catálogo y el select del formulario.
 *
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
async function fetchProducts() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?activo=eq.true&select=id,nombre,categoria,descripcion,imagen_url&order=categoria.asc`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      return { data: null, error: `Error ${response.status} al cargar productos.` };
    }

    const data = await response.json();
    return { data, error: null };

  } catch (networkError) {
    return { data: null, error: "No se pudieron cargar los productos." };
  }
}

// Exportar funciones para uso en otros módulos
// (compatible con script type="module" en HTML)
export { submitLead, fetchProducts, SUPABASE_URL, SUPABASE_KEY };
