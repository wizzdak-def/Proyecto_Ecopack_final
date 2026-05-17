/**
 * supabase.js — Ecopack
 * ─────────────────────────────────────────────────────────────
 * Maneja la inserción de leads en Supabase vía REST API.
 * ─────────────────────────────────────────────────────────────
 */

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_ANON_KEY";

// Endpoint donde se insertan los leads
const LEADS_ENDPOINT = `${SUPABASE_URL}/rest/v1/leads`;

// ── Headers comunes ────────────────────────────────────────────
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    // Supabase devuelve la fila insertada con esta cabecera
    "Prefer": "return=representation",
  };
}

/**
 * Inserta un lead en la tabla `leads` de Supabase.
 *
 * @param {Object} lead
 * @param {string}  lead.nombre
 * @param {string}  lead.correo
 * @param {string}  lead.telefono
 * @param {number}  lead.producto_id
 * @param {string}  lead.tipo_persona
 * @param {string}  lead.plazo
 * @param {number}  lead.prioridad
 *
 * @param {Object}  uiCallbacks
 * @param {Function} uiCallbacks.onLoading  — se llama al iniciar el envío
 * @param {Function} uiCallbacks.onSuccess  — se llama con el registro insertado
 * @param {Function} uiCallbacks.onError    — se llama con el mensaje de error
 *
 * @returns {Promise<void>}
 */
async function insertarLead(lead, { onLoading, onSuccess, onError } = {}) {
  // Notifica estado de carga
  if (typeof onLoading === "function") onLoading();

  try {
    const response = await fetch(LEADS_ENDPOINT, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(lead),
    });

    if (!response.ok) {
      // Intentamos leer el cuerpo del error para dar un mensaje útil
      let errorMsg = `Error ${response.status}: ${response.statusText}`;
      try {
        const errBody = await response.json();
        // Supabase suele devolver { message, details, hint, code }
        errorMsg = errBody.message || errBody.error || errorMsg;
      } catch (_) { /* el cuerpo no era JSON */ }

      throw new Error(errorMsg);
    }

    // Supabase devuelve array con las filas insertadas
    const data = await response.json();
    const registro = Array.isArray(data) ? data[0] : data;

    if (typeof onSuccess === "function") onSuccess(registro);
  } catch (err) {
    const mensaje = err.message || "Error desconocido al enviar el formulario.";
    if (typeof onError === "function") onError(mensaje);
    // También lo imprimimos en consola para facilitar el debug
    console.error("[Ecopack | Supabase]", err);
  }
}

// ── Exportación ────────────────────────────────────────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = { insertarLead };
} else {
  window.insertarLead = insertarLead;
}
