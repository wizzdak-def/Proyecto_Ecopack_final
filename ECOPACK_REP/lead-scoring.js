/**
 * lead-scoring.js — Ecopack
 * ─────────────────────────────────────────────────────────────
 * Calcula la prioridad de un lead según tipo de persona y plazo.
 *
 * Niveles:
 *   0 = visitante
 *   1 = baja
 *   2 = media
 *   3 = alta
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Calcula la prioridad del lead.
 *
 * @param {string} tipo_persona  — "individual" | "negocio" | "empresa"
 * @param {string} plazo         — "interes" | "medio" | "corto" | "urgente"
 * @returns {number} prioridad   — 0 | 1 | 2 | 3
 */
function calcularPrioridad(tipo_persona, plazo) {
  let prioridad;

  if (tipo_persona === "individual" && plazo === "interes") {
    // Sin intención de compra inmediata
    prioridad = 0;
  } else if (tipo_persona === "individual" && plazo === "medio") {
    // Interés real pero bajo volumen esperado
    prioridad = 1;
  } else if (tipo_persona === "negocio" && plazo === "medio") {
    // Negocio con plazo razonable — prioridad media
    prioridad = 2;
  } else if (tipo_persona === "empresa" && (plazo === "corto" || plazo === "urgente")) {
    // Empresa con necesidad inmediata — máxima prioridad
    prioridad = 3;
  } else if (plazo === "urgente") {
    // Cualquier persona con urgencia sube a alta
    prioridad = 3;
  } else {
    // Caso general — prioridad baja por defecto
    prioridad = 1;
  }

  return prioridad;
}

// ── Exportación para uso como módulo ES o como global ──────────
if (typeof module !== "undefined" && module.exports) {
  // CommonJS (Node / testing)
  module.exports = { calcularPrioridad };
} else {
  // Navegador — exponemos en window
  window.calcularPrioridad = calcularPrioridad;
}
