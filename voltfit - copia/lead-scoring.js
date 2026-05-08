/**
 * ============================================================
 * lead-scoring.js – VoltFit | JA Infinity
 * Clasificación automática de leads
 * Sin módulos ES – compatible con file://
 * ============================================================
 */

var PRIORIDAD_LABELS = { 0: "Visitante", 1: "Baja", 2: "Media", 3: "Alta" };
var PRIORIDAD_COLORS = { 0: "#666666",   1: "#f0a500", 2: "#0096c7", 3: "#39FF14" };

/**
 * Calcula la prioridad del lead.
 * @param {string} tipo_cliente  "personal" | "empresa"
 * @param {string} nivel_interes "bajo" | "medio" | "alto"
 * @returns {{ prioridad: number, label: string, color: string, descripcion: string }}
 */
function calcularPrioridad(tipo_cliente, nivel_interes) {
  var prioridad = 1;

  if      (tipo_cliente === "personal" && nivel_interes === "bajo")  { prioridad = 0; }
  else if (tipo_cliente === "personal" && nivel_interes === "medio") { prioridad = 1; }
  else if (tipo_cliente === "personal" && nivel_interes === "alto")  { prioridad = 2; }
  else if (tipo_cliente === "empresa"  && nivel_interes === "bajo")  { prioridad = 1; }
  else if (tipo_cliente === "empresa"  && nivel_interes === "medio") { prioridad = 2; }
  else if (tipo_cliente === "empresa"  && nivel_interes === "alto")  { prioridad = 3; }
  else { prioridad = 1; }

  var descripciones = {
    0: "Lead con bajo interés. Recomendado para campaña de nutrición automatizada.",
    1: "Lead " + tipo_cliente + " con interés " + nivel_interes + ". Seguimiento regular.",
    2: "Lead " + tipo_cliente + " con interés " + nivel_interes + ". Contactar en los próximos días.",
    3: "¡Lead caliente! Empresa con alto interés. Contactar en las próximas 24 horas."
  };

  return {
    prioridad:   prioridad,
    label:       PRIORIDAD_LABELS[prioridad],
    color:       PRIORIDAD_COLORS[prioridad],
    descripcion: descripciones[prioridad]
  };
}

/**
 * Valida los campos mínimos del formulario.
 * @param {Object} formData
 * @returns {{ valid: boolean, errores: string[] }}
 */
function validarLead(formData) {
  var errores = [];

  if (!formData.nombre_completo || formData.nombre_completo.trim().length < 2) {
    errores.push("El nombre completo es obligatorio.");
  }
  if (!formData.correo || !esEmailValido(formData.correo)) {
    errores.push("El correo electrónico no es válido.");
  }
  if (formData.telefono && !esTelefonoValido(formData.telefono)) {
    errores.push("El teléfono debe tener formato mexicano (+52 y 10 dígitos).");
  }
  if (!formData.tipo_cliente) {
    errores.push("Selecciona el tipo de cliente.");
  }
  if (!formData.nivel_interes) {
    errores.push("Selecciona el nivel de interés.");
  }
  if (!formData.acepta_privacidad) {
    errores.push("Debes aceptar el aviso de privacidad para continuar.");
  }

  return { valid: errores.length === 0, errores: errores };
}

/** Valida formato email */
function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Valida teléfono mexicano */
function esTelefonoValido(telefono) {
  var limpio = telefono.replace(/[\s\-()]/g, "");
  return /^(\+?52)?[1-9]\d{9}$/.test(limpio);
}
