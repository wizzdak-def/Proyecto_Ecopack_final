# 🌿 Ecopack B2B — Documentación Técnica

> Proyecto escolar desarrollado para la materia de **Ingeniería de Software**.  
> Sistema de captación de leads con integración a Supabase, Google Apps Script y HubSpot CRM.

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Estructura Real del Repositorio](#estructura-real-del-repositorio)
- [Base de Datos (Supabase)](#base-de-datos-supabase)
  - [schema.sql](#schemasql)
  - [Tabla: productos](#tabla-productos)
  - [Tabla: leads](#tabla-leads)
  - [Vista: v\_leads\_detalle](#vista-v_leads_detalle)
  - [Índices y RLS](#índices-y-rls)
- [Archivos de la Landing](#archivos-de-la-landing)
  - [home.html](#homehtml)
  - [landing.html](#landinghtml)
  - [styles.css](#stylescss)
  - [lead-scoring.js](#lead-scoringjs)
  - [supabase.js](#supabasejs)
- [Flujo de Automatizaciones](#flujo-de-automatizaciones)
  - [Edge Function: Disparador Webhook](#1-edge-function--disparador-webhook)
  - [Google Apps Script: Correo Automático](#2-google-apps-script--correo-automático)
  - [Google Apps Script: HubSpot CRM](#3-google-apps-script--hubspot-crm)
- [Variables de Entorno y Credenciales](#variables-de-entorno-y-credenciales)

---

## Descripción General

Ecopack B2B es una landing page orientada a la captación de clientes interesados en empaques sustentables, desarrollada como proyecto final de Ingeniería de Software. Cuando un usuario llena el formulario de contacto, sus datos fluyen automáticamente hacia:

1. **Supabase** — almacenamiento, fuente de verdad y disparador de webhooks.
2. **Correo electrónico** — notificación automática al equipo de ventas vía Google Apps Script.
3. **HubSpot CRM** — creación automática del contacto para seguimiento comercial.

---

## Arquitectura del Sistema

```
Usuario
  │
  │  Navega a home.html → selecciona producto → va a landing.html
  ▼
landing.html  +  lead-scoring.js  (calcula prioridad en el cliente)
  │
  │  supabase.js hace POST REST a la tabla `leads`
  ▼
Supabase — PostgreSQL
  ├── Tabla: productos  (catálogo FK)
  ├── Tabla: leads      (registros del formulario)
  └── Vista: v_leads_detalle (joins + labels legibles)
       │
       │  Database Webhook — evento INSERT en leads
       ▼
  Edge Function (Deno / TypeScript)  ← alojada en Supabase
       │
       ├──► Google Apps Script (Webhook HTTP)
       │         └── GmailApp → correo HTML al equipo de ventas
       │
       └──► Google Apps Script (Webhook HTTP)
                 └── UrlFetchApp → HubSpot Contacts API v3
```

---

## Estructura Real del Repositorio

Esta es la estructura exacta del proyecto en disco:

```
ECOPACK/
│
├── imgs/                       # Imágenes y assets visuales
│   ├── banner.png
│   ├── bolsas.png
│   ├── cajas.png
│   ├── cubiertos.png
│   ├── empaques.png
│   ├── envases.png
│   ├── ico.png
│   ├── icon.png
│   └── ecos.png
│
├── home.html                   # Página de inicio — catálogo de productos
├── landing.html                # Formulario de captación de leads
├── styles.css                  # Estilos globales del sitio
├── lead-scoring.js             # Lógica de priorización de leads (frontend)
├── supabase.js                 # Cliente REST de Supabase + inserción de leads
├── schema.sql                  # Definición completa de la base de datos
│
└── README.md
```

> Los Google Apps Scripts y la Edge Function de Supabase son servicios **externos** al repositorio. Se documentan aquí pero viven en sus respectivas plataformas (Google Apps Script y el panel de Supabase).

---

## Base de Datos (Supabase)

### `schema.sql`

El archivo `schema.sql` en la raíz del proyecto contiene toda la definición de la base de datos y puede ejecutarse directamente en el **SQL Editor de Supabase** para recrear el entorno desde cero. Es idempotente: usa `IF NOT EXISTS` y `ON CONFLICT DO NOTHING`, por lo que puede correrse múltiples veces sin errores.

---

### Tabla: `productos`

Catálogo maestro de productos. Sus IDs son fijos y se usan como clave foránea en `leads`.

```sql
CREATE TABLE IF NOT EXISTS productos (
  id     SERIAL PRIMARY KEY,
  nombre TEXT   NOT NULL
);
```

| `id` | `nombre`                              |
|------|---------------------------------------|
| `1`  | Empaques reciclados                   |
| `2`  | Cajas de cartón                       |
| `3`  | Cubiertos reciclados                  |
| `4`  | Bolsas de papel                       |
| `5`  | Envases biodegradables para alimentos |

---

### Tabla: `leads`

Almacena cada registro enviado desde el formulario de `landing.html`.

```sql
CREATE TABLE IF NOT EXISTS leads (
  id           SERIAL  PRIMARY KEY,
  nombre       TEXT    NOT NULL,
  correo       TEXT    NOT NULL,
  telefono     TEXT    NOT NULL,
  producto_id  INTEGER NOT NULL,
  tipo_persona TEXT    NOT NULL CHECK (tipo_persona IN ('individual', 'negocio', 'empresa')),
  plazo        TEXT    NOT NULL CHECK (plazo        IN ('interes', 'medio', 'corto', 'urgente')),
  prioridad    INTEGER NOT NULL CHECK (prioridad BETWEEN 0 AND 3),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE
);
```

#### Valores de `tipo_persona`

| Valor        | Descripción           |
|--------------|-----------------------|
| `individual` | Persona física        |
| `negocio`    | Negocio pequeño       |
| `empresa`    | Empresa / corporativo |

#### Valores de `plazo`

| Valor     | Descripción         |
|-----------|---------------------|
| `interes` | Solo explorando     |
| `medio`   | Plazo de meses      |
| `corto`   | Necesidad próxima   |
| `urgente` | Necesidad inmediata |

#### Valores de `prioridad` (calculado en frontend por `lead-scoring.js`)

| Valor | Label     | Color en notificación de correo |
|-------|-----------|---------------------------------|
| `0`   | Visitante | Gris `#9e9e9e`                  |
| `1`   | Baja      | Verde `#2e7d32`                 |
| `2`   | Media     | Amarillo `#f9a825`              |
| `3`   | Alta      | Rojo `#c62828`                  |

---

### Vista: `v_leads_detalle`

Une `leads` con `productos` y traduce el campo numérico `prioridad` a texto. Útil para dashboards y reportes sin escribir JOINs manuales.

```sql
CREATE OR REPLACE VIEW v_leads_detalle AS
SELECT
  l.id, l.nombre, l.correo, l.telefono,
  p.nombre          AS producto,
  l.producto_id,
  l.tipo_persona,
  l.plazo,
  l.prioridad,
  CASE l.prioridad
    WHEN 0 THEN 'Visitante'
    WHEN 1 THEN 'Baja'
    WHEN 2 THEN 'Media'
    WHEN 3 THEN 'Alta'
    ELSE 'Desconocida'
  END               AS prioridad_label,
  l.created_at
FROM leads l
JOIN productos p ON p.id = l.producto_id
ORDER BY l.prioridad DESC, l.created_at DESC;
```

---

### Índices y RLS

**Índices definidos en `schema.sql`:**

| Índice                  | Columna(s)                        | Propósito                              |
|-------------------------|-----------------------------------|----------------------------------------|
| `idx_leads_prioridad`   | `prioridad DESC, created_at DESC` | Tablero de ventas ordenado             |
| `idx_leads_producto`    | `producto_id`                     | Filtrar por producto                   |
| `idx_leads_tipo_persona`| `tipo_persona`                    | Filtrar por tipo de cliente            |
| `idx_leads_correo`      | `correo`                          | Búsqueda rápida y detección duplicados |

**Políticas de Row Level Security:**

| Tabla       | Operación | Quién puede                     |
|-------------|-----------|----------------------------------|
| `productos` | `SELECT`  | Cualquiera (catálogo público)    |
| `leads`     | `INSERT`  | Cualquiera (formulario público)  |
| `leads`     | `SELECT`  | Solo usuarios autenticados       |

---

## Archivos de la Landing

### `home.html`

Página de inicio del sitio. Contiene:
- **Navbar** con logo y botón de CTA hacia `landing.html`.
- **Hero** con título, descripción y llamadas a la acción.
- **Stats** con métricas clave (clientes activos, cobertura local, tiempo de entrega).
- **Catálogo** con 5 tarjetas de producto. Cada botón "Ver más →" enlaza a `landing.html?producto=<id>`, preseleccionando el producto en el formulario.
- **CTA final** y **footer**.

---

### `landing.html`

Formulario de captación de leads. Campos que recopila:

| Campo           | Tipo      | Notas                                        |
|-----------------|-----------|----------------------------------------------|
| Nombre          | `text`    |                                              |
| Correo          | `email`   |                                              |
| Teléfono        | `tel`     |                                              |
| Producto        | `select`  | Preseleccionado desde URL (`?producto=<id>`) |
| Tipo de persona | `select`  | `individual` / `negocio` / `empresa`         |
| Plazo           | `select`  | `interes` / `medio` / `corto` / `urgente`    |

Al hacer submit: primero llama a `calcularPrioridad()` de `lead-scoring.js` y luego a `insertarLead()` de `supabase.js`.

---

### `styles.css`

Hoja de estilos global. Define la paleta de marca Ecopack:

| Uso             | Color       |
|-----------------|-------------|
| Verde principal | `#2d572c`   |
| Fondo crema     | `#f4f1ea`   |
| Texto oscuro    | `#1c2b1e`   |

Incluye estilos para navbar, hero, stats, catálogo, tarjetas de producto, botones, formulario y footer. Usa la clase `animate-up` para animaciones de entrada por sección.

---

### `lead-scoring.js`

Calcula la prioridad del lead **en el cliente** antes de enviarlo a Supabase, sin round-trip al servidor.

```js
function calcularPrioridad(tipo_persona, plazo) {
  if (tipo_persona === "individual" && plazo === "interes")                        return 0;
  if (tipo_persona === "individual" && plazo === "medio")                          return 1;
  if (tipo_persona === "negocio"    && plazo === "medio")                          return 2;
  if (tipo_persona === "empresa"    && (plazo === "corto" || plazo === "urgente")) return 3;
  if (plazo === "urgente")                                                         return 3;
  return 1; // caso general — prioridad baja por defecto
}
```

Compatible con navegador (`window.calcularPrioridad`) y Node.js/tests (`module.exports`).

---

### `supabase.js`

Maneja la inserción REST en Supabase. Expone la función `insertarLead(lead, callbacks)`.

**Parámetros del objeto `lead`:**

| Campo          | Tipo     |
|----------------|----------|
| `nombre`       | `string` |
| `correo`       | `string` |
| `telefono`     | `string` |
| `producto_id`  | `number` |
| `tipo_persona` | `string` |
| `plazo`        | `string` |
| `prioridad`    | `number` |

**Callbacks opcionales:**

| Callback    | Cuándo se llama                             |
|-------------|---------------------------------------------|
| `onLoading` | Al iniciar el `fetch`                       |
| `onSuccess` | Con el registro insertado devuelto por la API |
| `onError`   | Con el mensaje de error en caso de fallo    |

Hace `POST` al endpoint `/rest/v1/leads` con los headers `apikey`, `Authorization` y `Prefer: return=representation`. Los errores de Supabase se deserializan y exponen con su mensaje original para facilitar el debug.

> ⚠️ La URL y Anon Key de Supabase **no deben subirse al repositorio público**. Añade el archivo a `.gitignore` o mueve las credenciales a variables de entorno.

---

## Flujo de Automatizaciones

### 1. Edge Function — Disparador Webhook

**Plataforma:** Supabase Edge Functions (Deno / TypeScript)  
**Trigger:** Database Webhook — evento `INSERT` en tabla `leads`

Actúa como orquestadora: recibe el payload del webhook (clave `record`) y lo reenvía a los Google Apps Scripts.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { record } = await req.json()

    const GOOGLE_SCRIPT_URL = Deno.env.get("GOOGLE_SCRIPT_URL") ?? ""

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:           record.id,
        nombre:       record.nombre,
        correo:       record.correo,
        telefono:     record.telefono,
        prioridad:    record.prioridad,
        producto_id:  record.producto_id,
        tipo_persona: record.tipo_persona
      }),
    })

    const result = await response.text()
    return new Response(
      JSON.stringify({ status: 'Enviado a Google', details: result }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    )
  }
})
```

> 💡 Para registrar el webhook: **Supabase → Database → Webhooks → Create webhook**, tabla `leads`, evento `INSERT`, apuntar a la URL de la Edge Function desplegada.

---

### 2. Google Apps Script — Correo Automático

**Plataforma:** Google Apps Script  
**Tipo de trigger:** HTTP POST (llamado desde la Edge Function)  
**Servicio:** `GmailApp`

Recibe el record del lead, traduce los valores numéricos a texto y envía un correo HTML con diseño de marca Ecopack al equipo de ventas.

**Resolución de campos antes de enviar:**

| Campo recibido      | Transformación aplicada                            |
|---------------------|----------------------------------------------------|
| `prioridad` (0–3)   | Texto + badge de color (gris/verde/amarillo/rojo)  |
| `producto_id` (1–5) | Nombre del producto del catálogo                   |

**Estructura del correo generado:**
- Encabezado con branding Ecopack (verde `#2d572c`, fondo crema `#f4f1ea`).
- Tabla con: ID, nombre, correo, teléfono, prioridad (badge de color) y producto (badge verde).
- Footer con identificación del sistema automático.

> ⚠️ El correo destinatario debe guardarse en las **Propiedades del proyecto** del script, no hardcodeado en el código fuente.

---

### 3. Google Apps Script — HubSpot CRM

**Plataforma:** Google Apps Script  
**Tipo de trigger:** HTTP Request (webhook independiente)  
**Servicio:** `UrlFetchApp` + HubSpot Contacts API v3

Crea un nuevo contacto en HubSpot con los datos del lead recién insertado.

**Mapeo de campos Supabase → HubSpot:**

| Campo Supabase | Propiedad HubSpot | Notas                              |
|----------------|-------------------|------------------------------------|
| `nombre`       | `firstname`       | Propiedad estándar                 |
| `correo`       | `email`           | Propiedad estándar                 |
| `telefono`     | `phone`           | Propiedad estándar                 |
| `tipo_persona` | `tipo_persona`    | Propiedad personalizada            |
| `producto_id`  | `producto`        | Se resuelve al nombre del catálogo |
| `id`           | `id_usuario`      | Propiedad personalizada            |
| `prioridad`    | `prioridad`       | Se resuelve a texto; custom        |

> ⚠️ Las propiedades personalizadas deben existir previamente en HubSpot: **Configuración → Propiedades → Contactos**.

> 🔑 El token Bearer de HubSpot nunca debe subirse al repositorio. Guárdalo en **Archivo → Propiedades del proyecto** dentro de Google Apps Script.

---

## Variables de Entorno y Credenciales

Ninguna credencial debe existir en el repositorio. Referencia por contexto:

### `supabase.js` (Landing)

| Variable       | Qué es                             |
|----------------|------------------------------------|
| `SUPABASE_URL` | URL del proyecto (`*.supabase.co`) |
| `SUPABASE_KEY` | Anon Key pública del proyecto      |

### Edge Function (Supabase Secrets)

| Variable            | Qué es                                |
|---------------------|---------------------------------------|
| `GOOGLE_SCRIPT_URL` | URL del Google Apps Script de destino |

### Google Apps Script (Propiedades del proyecto)

| Propiedad       | Qué es                                |
|-----------------|---------------------------------------|
| `HUBSPOT_TOKEN` | Personal Access Token de HubSpot      |
| `DEST_EMAIL`    | Correo destinatario de notificaciones |

---

<div align="center">
  <sub>Proyecto escolar · Ingeniería de Software · Ecopack Soluciones B2B · Comprometidos con el planeta 🌱</sub>
</div>
