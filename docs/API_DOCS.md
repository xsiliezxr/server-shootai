# API Documentation — ShootAI Server

> **Regla del proyecto:** Cada vez que se cree, modifique o elimine un endpoint, este archivo **debe** actualizarse con el método, la ruta, el body esperado y las respuestas de éxito/error en formato JSON.

**Base URL:** `http://localhost:3000/api`

---

## Índice de endpoints

| Módulo | Método | Ruta | Descripción |
|--------|--------|------|-------------|
| Health | `GET` | `/health` | Estado del servidor |
| Empresas | `POST` | `/empresas` | Crear empresa |
| Empresas | `GET` | `/empresas` | Listar empresas |
| Empresas | `GET` | `/empresas/:id` | Obtener empresa |
| Empresas | `PATCH` | `/empresas/:id` | Actualizar empresa |
| Empresas | `DELETE` | `/empresas/:id` | Eliminar empresa |
| Clientes | `POST` | `/clientes` | Crear cliente |
| Clientes | `GET` | `/clientes` | Listar clientes |
| Clientes | `GET` | `/clientes/:id` | Obtener cliente |
| Clientes | `PATCH` | `/clientes/:id` | Actualizar cliente |
| Clientes | `DELETE` | `/clientes/:id` | Eliminar cliente |
| Projects | `POST` | `/projects` | Crear proyecto/sesión |
| Projects | `GET` | `/projects` | Listar proyectos |
| Projects | `GET` | `/projects/:id` | Obtener proyecto |
| Projects | `PATCH` | `/projects/:id` | Actualizar proyecto |
| Projects | `DELETE` | `/projects/:id` | Eliminar proyecto |
| Projects | `GET` | `/projects/:id/export` | Export consolidado |
| Requirements | `POST` | `/requirements` | **A.** Guardar requerimientos (texto/imagen/docs) |
| Requirements | `POST` | `/requirements/:projectId/process` | **B.** Procesar y recomendar prendas |
| Requirements | `POST` | `/requirements/:projectId/shoot-plan` | **C.** Plan de shoot mock (poses/ángulos) |
| Style Match | `POST` | `/style-match` | Atajo pre-shoot todo-en-uno |
| Creative Dump | `POST` | `/creative-dump` | Ingesta brief en proyecto existente |
| Catálogo | `POST` | `/catalog` | Agregar prendas |
| Catálogo | `GET` | `/catalog` | Listar prendas |
| Catálogo | `POST` | `/catalog/color-match` | Matching por teoría del color |
| Scraping | `POST` | `/catalog/scrape` | Scrapear catálogo de marca (Firecrawl) |
| Fashion | `POST` | `/fashion-matcher` | Recomendar por tags del proyecto |
| Vision | `POST` | `/vision/upload-model` | Subir foto modelo + recomendación cámara/pose |
| WhatsApp | `POST` | `/whatsapp/webhook` | Evento entrante (mock n8n) |
| WhatsApp | `POST` | `/whatsapp/send` | Mensaje saliente |
| WhatsApp | `POST` | `/whatsapp/send-analysis` | Resumen estructurado para WhatsApp |

> **Flujo recomendado (pre-shoot):** `POST /requirements` → `POST /requirements/:id/process` → `POST /requirements/:id/shoot-plan`

---

### Health Check

Verifica que el servidor esté en funcionamiento.

| Campo    | Valor           |
|----------|-----------------|
| Método   | `GET`           |
| Ruta     | `/health`       |
| Auth     | No requerida    |

#### Body esperado

Ninguno.

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 123.456,
    "timestamp": "2026-07-04T20:00:00.000Z",
    "environment": "development"
  }
}
```

#### Respuesta de error — `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "message": "Internal Server Error"
  }
}
```

---

## Empresas

### Crear empresa

| Campo  | Valor        |
|--------|--------------|
| Método | `POST`       |
| Ruta   | `/empresas`  |

#### Body esperado

```json
{
  "name": "Zara MX",
  "website": "https://www.zara.com"
}
```

#### Respuesta de éxito — `201 Created`

```json
{
  "success": true,
  "data": {
    "_id": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
    "name": "Zara MX",
    "slug": "zara-mx",
    "website": "https://www.zara.com"
  }
}
```

---

### Listar empresas

| Campo  | Valor        |
|--------|--------------|
| Método | `GET`        |
| Ruta   | `/empresas`  |

#### Body esperado

Ninguno.

---

### Obtener / actualizar / eliminar empresa

| Acción   | Método   | Ruta              |
|----------|----------|-------------------|
| Obtener  | `GET`    | `/empresas/:id`   |
| Actualizar | `PATCH` | `/empresas/:id` |
| Eliminar | `DELETE` | `/empresas/:id` |

---

## Clientes

### Crear cliente

| Campo  | Valor        |
|--------|--------------|
| Método | `POST`       |
| Ruta   | `/clientes`  |

#### Body esperado

```json
{
  "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
  "name": "María López",
  "phone": "+5215512345678",
  "email": "maria@example.com"
}
```

#### Respuesta de éxito — `201 Created`

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
    "name": "María López",
    "phone": "+5215512345678",
    "email": "maria@example.com"
  }
}
```

---

### Listar clientes

| Campo  | Valor        |
|--------|--------------|
| Método | `GET`        |
| Ruta   | `/clientes`  |

#### Query params (opcionales)

| Param       | Descripción              |
|-------------|--------------------------|
| `empresaId` | Filtra por empresa       |

---

### Obtener / actualizar / eliminar cliente

| Acción   | Método   | Ruta              |
|----------|----------|-------------------|
| Obtener  | `GET`    | `/clientes/:id`   |
| Actualizar | `PATCH` | `/clientes/:id` |
| Eliminar | `DELETE` | `/clientes/:id` |

---

## Creative Blueprint — Projects

### Crear proyecto

| Campo  | Valor        |
|--------|--------------|
| Método | `POST`       |
| Ruta   | `/projects`  |

#### Body esperado

```json
{
  "name": "Editorial Session Q3",
  "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
  "clienteId": "optional-cliente-uuid",
  "status": "draft"
}
```

| Campo       | Tipo   | Requerido | Descripción                          |
|-------------|--------|-----------|--------------------------------------|
| `name`      | string | Sí        | Nombre de la sesión                  |
| `empresaId` | string | Sí        | UUID de la empresa                   |
| `clienteId` | string | No        | UUID del cliente                     |
| `status`    | string | No        | `draft`, `processing` o `ready`      |

#### Respuesta de éxito — `201 Created`

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6789012345",
    "name": "Editorial Session Q3",
    "status": "draft",
    "creativeDump": { "images": [], "freeText": "", "aestheticTags": [] },
    "fashionMatches": [],
    "visionAnalysis": {},
    "whatsappEvents": [],
    "createdAt": "2026-07-04T20:00:00.000Z",
    "updatedAt": "2026-07-04T20:00:00.000Z"
  }
}
```

#### Respuesta de error — `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "message": "Project name is required"
  }
}
```

---

### Listar proyectos

| Campo  | Valor        |
|--------|--------------|
| Método | `GET`        |
| Ruta   | `/projects`  |

#### Body esperado

Ninguno.

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "_id": "665a1b2c3d4e5f6789012345",
      "name": "Editorial Session Q3",
      "status": "draft"
    }
  ]
}
```

---

### Obtener proyecto por ID

| Campo  | Valor              |
|--------|--------------------|
| Método | `GET`              |
| Ruta   | `/projects/:id`    |

#### Body esperado

Ninguno.

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6789012345",
    "name": "Editorial Session Q3",
    "status": "processing",
    "creativeDump": {},
    "fashionMatches": [],
    "visionAnalysis": {},
    "whatsappEvents": []
  }
}
```

#### Respuesta de error — `404 Not Found`

```json
{
  "success": false,
  "error": {
    "message": "Project not found"
  }
}
```

---

### Actualizar proyecto

| Campo  | Valor              |
|--------|--------------------|
| Método | `PATCH`            |
| Ruta   | `/projects/:id`    |

#### Body esperado

```json
{
  "name": "Updated Session Name",
  "status": "ready"
}
```

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6789012345",
    "name": "Updated Session Name",
    "status": "ready"
  }
}
```

---

### Eliminar proyecto

| Campo  | Valor              |
|--------|--------------------|
| Método | `DELETE`           |
| Ruta   | `/projects/:id`    |

#### Body esperado

Ninguno.

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "Project deleted successfully"
  }
}
```

---

### Exportar sesión consolidada

| Campo  | Valor                    |
|--------|--------------------------|
| Método | `GET`                    |
| Ruta   | `/projects/:id/export`   |

#### Body esperado

Ninguno.

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "665a1b2c3d4e5f6789012345",
    "name": "Editorial Session Q3",
    "status": "ready",
    "creativeDump": {
      "images": [{ "url": "https://...", "publicId": "shootai/...", "caption": "" }],
      "freeText": "Minimal luxury editorial",
      "aestheticTags": ["minimalist", "luxury", "editorial"]
    },
    "recommendedGarments": [
      { "garmentId": "...", "name": "Neon Mesh Bodysuit", "brand": "Mugler", "type": "top", "score": 3, "matchedTags": ["cyberpunk", "neon"] }
    ],
    "visionAnalysis": {
      "modelImage": { "url": "https://...", "publicId": "shootai/..." },
      "proportions": { "height": "average", "shoulderWidth": "average", "torsoLength": "balanced", "legRatio": "balanced" },
      "recommendation": { "camera": "Mirrorless Full-frame", "lens": "50mm f/1.8", "pose": "Classic editorial standing pose", "rationale": "..." }
    },
    "whatsappEvents": [],
    "createdAt": "2026-07-04T20:00:00.000Z",
    "updatedAt": "2026-07-04T20:30:00.000Z",
    "exportedAt": "2026-07-04T20:35:00.000Z"
  }
}
```

---

## Creative Dump — Ingesta

### Subir imágenes y texto libre

| Campo  | Valor               |
|--------|---------------------|
| Método | `POST`              |
| Ruta   | `/creative-dump`    |
| Content-Type | `multipart/form-data` |

#### Body esperado

| Campo         | Tipo     | Requerido | Descripción                    |
|---------------|----------|-----------|--------------------------------|
| `projectId`   | string   | Sí        | UUID del proyecto              |
| `freeText`    | string   | No        | Texto libre de inspiración     |
| `images`      | file[]   | No        | Imágenes (máx. 10, 10MB c/u)   |
| `documents`   | file[]   | No        | PDF/TXT/MD (máx. 5, 10MB c/u)  |

#### Respuesta de éxito — `201 Created`

```json
{
  "success": true,
  "data": {
    "projectId": "665a1b2c3d4e5f6789012345",
    "creativeDump": {
      "images": [{ "url": "https://res.cloudinary.com/...", "publicId": "shootai/creative-dump/...", "caption": "" }],
      "freeText": "Minimal luxury editorial with soft pastels",
      "aestheticTags": ["minimalist", "luxury", "soft-pastel", "editorial"]
    },
    "pipeline": {
      "storage": "cloudinary",
      "llm": "mock"
    }
  }
}
```

#### Respuesta de error — `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "message": "projectId is required"
  }
}
```

#### Respuesta de error — `503 Service Unavailable`

```json
{
  "success": false,
  "error": {
    "message": "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET"
  }
}
```

---

## Catálogo de Prendas (Inventario pre-cargado)

El catálogo vive en Supabase (`shootai-catalog`, tabla `garment`) por empresa. Precarga con `npm run seed` o alimenta por API / scraping.

| Campo garment | Descripción |
|---------------|-------------|
| `color` | Nombre legible del color dominante |
| `colorHex` | HEX del color dominante (ej. `#1a2b3c`) |
| `colorHsl` | `[h, s, l]` del dominante (0-360, 0-100, 0-100) |
| `colorPalette` | Top 3-5 colores HEX extraídos de la imagen |

### Agregar prendas al catálogo

| Campo  | Valor        |
|--------|--------------|
| Método | `POST`       |
| Ruta   | `/catalog`   |

#### Body esperado

Acepta un objeto único, un array de objetos, o `{ "empresaId": "...", "garments": [...] }`.

```json
{
  "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
  "garments": [
    {
      "name": "Structured Wool Blazer",
      "brand": "The Row",
      "type": "outerwear",
      "color": "charcoal",
      "silhouette": "tailored",
      "categories": ["minimalist", "luxury"],
      "aestheticTags": ["minimalist", "luxury", "monochrome"],
      "imageUrl": "https://.../blazer.jpg",
      "productUrl": "https://www.ssense.com/...",
      "price": 1890,
      "currency": "USD"
    }
  ]
}
```

| Campo           | Tipo     | Requerido | Descripción                          |
|-----------------|----------|-----------|--------------------------------------|
| `empresaId`     | string   | Sí        | UUID de la empresa dueña del catálogo |
| `name`          | string   | Sí        | Nombre de la prenda                  |
| `type`          | string   | Sí        | Tipo (`outerwear`, `top`, `bottom`, `dress`, `footwear`, `accessory`) |
| `categories`    | string[] | No        | Categorías de estilo (streetwear, baggy, etc.) |
| `aestheticTags` | string[] | No        | Etiquetas estéticas                  |
| `brand`, `color`, `colorHex`, `colorHsl`, `colorPalette`, `silhouette`, `imageUrl`, `productUrl`, `price`, `currency` | mixto | No | Metadatos (`imageUrl` requerido al insertar) |

#### Respuesta de éxito — `201 Created`

```json
{
  "success": true,
  "data": {
    "inserted": 1,
    "garments": [{ "_id": "...", "name": "Structured Wool Blazer", "aestheticTags": ["minimalist", "luxury", "monochrome"] }]
  }
}
```

#### Respuesta de error — `400 Bad Request`

```json
{ "success": false, "error": { "message": "Each garment requires at least \"name\" and \"type\"" } }
```

---

### Listar catálogo

| Campo  | Valor        |
|--------|--------------|
| Método | `GET`        |
| Ruta   | `/catalog`   |

#### Query params (opcionales)

| Param       | Descripción                        |
|-------------|------------------------------------|
| `empresaId` | Filtra por empresa (recomendado)   |
| `type`      | Filtra por tipo de prenda          |
| `tag`       | Filtra por una etiqueta estética   |
| `limit`     | Máximo de resultados (default 100) |

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": [
    { "_id": "...", "name": "Neon Mesh Bodysuit", "brand": "Mugler", "type": "top", "color": "neon green", "colorHex": "#39ff14", "colorHsl": [110, 100, 50], "colorPalette": ["#39ff14", "#1a1a1a"], "imageUrl": "https://...", "aestheticTags": ["cyberpunk", "futuristic", "neon"] }
  ]
}
```

---

### Sugerencias por teoría del color

Ordena prendas del catálogo según armonía cromática (complementario, análogo, triádico, monocromático) respecto a un color base.

| Campo  | Valor               |
|--------|---------------------|
| Método | `POST`              |
| Ruta   | `/catalog/color-match` |

#### Body esperado

```json
{
  "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
  "baseColor": "#1a2b3c",
  "limit": 8,
  "type": "top"
}
```

| Campo       | Tipo           | Requerido | Descripción |
|-------------|----------------|-----------|-------------|
| `empresaId` | string (UUID)  | Sí        | Empresa dueña del catálogo |
| `baseColor` | string o `[h,s,l]` | Sí    | Color base en HEX (`#rrggbb`) o HSL |
| `limit`     | number         | No        | Máximo de resultados (default 8) |
| `type`      | string         | No        | Filtrar por tipo de prenda |

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
    "baseColor": [210, 35, 17],
    "count": 3,
    "garments": [
      {
        "_id": "...",
        "name": "BASIC SLIM FIT T-SHIRT /01",
        "color": "white",
        "colorHex": "#f5f5f5",
        "colorHsl": [0, 0, 96],
        "colorPalette": ["#f5f5f5", "#1a1a1a"],
        "imageUrl": "https://static.zara.net/...jpg",
        "colorScore": 0.88,
        "colorHarmony": "complementary"
      }
    ]
  }
}
```

#### Respuesta de error — `409 Conflict`

```json
{
  "success": false,
  "error": {
    "message": "No garments with color data found. Run POST /api/catalog/scrape first"
  }
}
```

---

## AI Fashion Matcher — Recomendaciones sobre catálogo

Cruza las `aestheticTags` del proyecto (generadas por el Creative Dump) contra el catálogo y devuelve las prendas con mayor coincidencia. Guarda el resultado en `project.recommendedGarments`.

### Recomendar prendas para un proyecto

| Campo  | Valor              |
|--------|--------------------|
| Método | `POST`             |
| Ruta   | `/fashion-matcher` |

#### Body esperado

```json
{
  "projectId": "665a1b2c3d4e5f6789012345",
  "limit": 8
}
```

| Campo       | Tipo   | Requerido | Descripción                          |
|-------------|--------|-----------|--------------------------------------|
| `projectId` | string | Sí        | ID del proyecto                      |
| `limit`     | number | No        | Cantidad de prendas a devolver (default 8) |

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "projectId": "665a1b2c3d4e5f6789012345",
    "basedOnTags": ["cyberpunk", "futuristic", "neon"],
    "count": 8,
    "recommendedGarments": [
      {
        "garmentId": "...",
        "name": "Neon Mesh Bodysuit",
        "brand": "Mugler",
        "type": "top",
        "color": "neon-green",
        "silhouette": "bodycon",
        "imageUrl": "https://.../bodysuit.jpg",
        "productUrl": "https://www.ssense.com/...",
        "score": 3,
        "matchedTags": ["cyberpunk", "futuristic", "neon"],
        "selected": false
      }
    ]
  }
}
```

#### Respuesta de error — `409 Conflict`

```json
{
  "success": false,
  "error": {
    "message": "Catalog is empty. Load garments via POST /api/catalog (or run npm run seed) first"
  }
}
```

#### Respuesta de error — `400 Bad Request`

```json
{ "success": false, "error": { "message": "projectId is required" } }
```

---

## Requirements — Flujo dividido (Pre-shoot en 3 pasos)

Pipeline encadenado por `projectId`. Reutiliza la tabla `project` en Supabase general. Ideal para la demo donde cada etapa es un endpoint independiente.

```mermaid
flowchart LR
  A["POST /requirements"] --> B["POST /requirements/:id/process"]
  B --> C["POST /requirements/:id/shoot-plan"]
```

> **Atajo todo-en-uno:** `POST /api/style-match` sigue disponible y ejecuta intake + matching en una sola llamada.

### A. Recibir y guardar requerimientos

| Campo  | Valor               |
|--------|---------------------|
| Método | `POST`              |
| Ruta   | `/requirements`     |
| Content-Type | `multipart/form-data` o `application/json` (solo texto) |

#### Body esperado

| Campo       | Tipo     | Requerido | Descripción                              |
|-------------|----------|-----------|------------------------------------------|
| `empresaId` | string   | No*       | UUID de la empresa (*usa `DEMO_EMPRESA_ID` si se omite) |
| `clienteId` | string   | No        | UUID del cliente                         |
| `name`      | string   | No        | Nombre de la solicitud                   |
| `freeText`  | string   | No        | Brief / requerimientos                   |
| `images`    | file[]   | No        | Imágenes de referencia (máx. 10)         |
| `documents` | file[]   | No        | PDF/TXT/MD (máx. 5)                      |

#### Respuesta de éxito — `201 Created`

```json
{
  "success": true,
  "data": {
    "projectId": "402816bd-0b5f-496f-a7e7-294a8be699bd",
    "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
    "status": "requirements",
    "freeText": "Quiero fotos como la referencia con el mismo estilo",
    "images": [{ "url": "https://...", "publicId": "...", "caption": "" }],
    "documents": [],
    "pipeline": { "storage": "cloudinary", "stage": "requirements-intake" }
  }
}
```

---

### B. Procesar requerimientos (matching + color)

| Campo  | Valor                              |
|--------|------------------------------------|
| Método | `POST`                             |
| Ruta   | `/requirements/:projectId/process` |
| Content-Type | `application/json`           |

#### Body esperado

| Campo       | Tipo   | Requerido | Descripción                                      |
|-------------|--------|-----------|--------------------------------------------------|
| `limit`     | number | No        | Prendas a devolver (default 8)                   |
| `baseColor` | string | No        | Color base HEX (`#1a2b3c`) para teoría del color |

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "projectId": "402816bd-0b5f-496f-a7e7-294a8be699bd",
    "extractedCategories": ["casual", "smart-casual"],
    "aestheticTags": ["relajado", "moderno", "informal"],
    "count": 5,
    "recommendedGarments": [
      {
        "garmentId": "...",
        "name": "RELAXED FIT PLEATED PANTS",
        "brand": "Zara",
        "type": "bottom",
        "score": 2.8,
        "colorScore": 0.85,
        "colorHarmony": "analogous",
        "matchedCategories": ["casual"]
      }
    ],
    "pipeline": {
      "llm": "openai",
      "matcher": "category-overlap+color-theory",
      "colorTheory": "applied"
    }
  }
}
```

#### Respuesta de error — `404 Not Found`

```json
{ "success": false, "error": { "message": "Project not found" } }
```

---

### C. Plan de shoot (MOCK — poses y ángulos)

| Campo  | Valor                                 |
|--------|---------------------------------------|
| Método | `POST`                                |
| Ruta   | `/requirements/:projectId/shoot-plan`  |
| Content-Type | `multipart/form-data` o `application/json` |

#### Body esperado

| Campo         | Tipo   | Requerido | Descripción                          |
|---------------|--------|-----------|--------------------------------------|
| `image`       | file   | No        | Foto del modelo (opcional)           |
| `proportions` | string | No        | JSON con proporciones (override)     |

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "projectId": "402816bd-0b5f-496f-a7e7-294a8be699bd",
    "source": "mock",
    "modelEndpoint": null,
    "camera": "Full-frame mirrorless",
    "lens": "85mm f/1.4",
    "lighting": "Soft natural window light with fill reflector",
    "poses": [
      { "id": "pose-three-quarter", "name": "Three-quarter angle", "description": "..." }
    ],
    "angles": [
      { "id": "angle-eye-level", "degrees": 0, "label": "Eye level — natural portrait" }
    ],
    "recommendation": {
      "pose": "Three-quarter angle",
      "angle": "Eye level — natural portrait",
      "camera": "Full-frame mirrorless",
      "lens": "85mm f/1.4",
      "rationale": "..."
    },
    "pipeline": { "shootModel": "mock", "recommendationEngine": "static-shoot-plan-v1" }
  }
}
```

> Conecta `SHOOT_MODEL_URL` en `.env` para reemplazar el mock por el modelo real de poses/ángulos (sin implementar lógica aún).

---

## Style Match — Flujo principal / Pre-shoot (OpenAI + catálogo)

Orquesta el flujo **pre-shoot**: la empresa manda requerimientos (texto, imágenes, documentos), el sistema extrae categorías con OpenAI, compara contra el catálogo de la empresa y devuelve una lista de prendas recomendadas. Persiste `project` y `outfit` en Supabase.

> **Demo de una sola empresa:** configura `DEMO_EMPRESA_ID` en `.env` (obtén el UUID con `npm run seed`) y omite `empresaId` en el body. Si no envías `empresaId` y falta `DEMO_EMPRESA_ID`, responde `400`.

### Ejecutar style match

| Campo  | Valor               |
|--------|---------------------|
| Método | `POST`              |
| Ruta   | `/style-match`      |
| Content-Type | `multipart/form-data` o `application/json` (solo texto) |

#### Body esperado

| Campo       | Tipo     | Requerido | Descripción                              |
|-------------|----------|-----------|------------------------------------------|
| `empresaId` | string   | No*       | UUID de la empresa (*usa `DEMO_EMPRESA_ID` del `.env` si se omite) |
| `clienteId` | string   | No        | UUID del cliente                         |
| `name`      | string   | No        | Nombre de la solicitud                   |
| `freeText`  | string   | No        | Brief de estilo / requerimientos         |
| `images`    | file[]   | No        | Imágenes de referencia (máx. 10)         |
| `documents` | file[]   | No        | PDF/TXT/MD con brief (máx. 5)            |
| `limit`     | number   | No        | Prendas a devolver (default 8)           |

#### Ejemplo demo (solo texto, sin `empresaId`)

```json
{
  "freeText": "Look streetwear baggy, tonos neutros, urbano relajado",
  "limit": 5
}
```

#### Respuesta de error — `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "message": "empresaId is required (set DEMO_EMPRESA_ID)"
  }
}
```

#### Respuesta de éxito — `201 Created`

```json
{
  "success": true,
  "data": {
    "projectId": "402816bd-0b5f-496f-a7e7-294a8be699bd",
    "outfitId": "e480f86c-c340-4ad4-bc55-deb16585d8f0",
    "extractedCategories": ["streetwear", "baggy"],
    "aestheticTags": ["streetwear", "baggy", "oversized", "urban"],
    "count": 5,
    "recommendedGarments": [
      {
        "garmentId": "...",
        "name": "Oversized Graphic Hoodie",
        "brand": "Balenciaga",
        "type": "top",
        "imageUrl": "https://.../hoodie.jpg",
        "productUrl": "https://...",
        "score": 2,
        "matchedCategories": ["streetwear", "urban"]
      }
    ],
    "pipeline": {
      "storage": "cloudinary",
      "llm": "openai",
      "matcher": "category-overlap"
    }
  }
}
```

#### Respuesta de error — `409 Conflict`

```json
{
  "success": false,
  "error": {
    "message": "Catalog is empty for this empresa. Run POST /api/catalog/scrape first"
  }
}
```

---

## Catalog Scraping — Firecrawl

Extrae productos de una URL de marca/tienda usando Firecrawl, resuelve imágenes reales por página de producto, extrae paleta de color localmente, clasifica categorías con OpenAI e inserta en el catálogo (`shootai-catalog`).

Solo inserta productos con URL de producto válida (`-pXXXX.html`), precio > 0 e imagen real (`.jpg`/`.webp`). Descarta links de navegación (`-lXXXX.html`).

### Scrapear catálogo de marca

| Campo  | Valor                 |
|--------|-----------------------|
| Método | `POST`                |
| Ruta   | `/catalog/scrape`     |

#### Body esperado

```json
{
  "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
  "brand": "Zara",
  "url": "https://www.zara.com/mx/en/man-new-in-l806.html",
  "limit": 20
}
```

| Campo       | Tipo   | Requerido | Descripción                              |
|-------------|--------|-----------|------------------------------------------|
| `empresaId` | string | Sí        | UUID de la empresa                       |
| `url`       | string | Sí        | URL de listado/categoría de la marca     |
| `brand`     | string | No        | Nombre de la marca                       |
| `limit`     | number | No        | Máximo de productos (default 20)       |

#### Respuesta de éxito — `201 Created`

```json
{
  "success": true,
  "data": {
    "empresaId": "520d6f4f-7dec-4821-9b17-2f54e35772fd",
    "brand": "Zara",
    "url": "https://www.zara.com/...",
    "scraped": 8,
    "inserted": 8,
    "source": "firecrawl",
    "classifier": "heuristic",
    "garments": [
      {
        "name": "RELAXED FIT FAUX SUEDE JACKET",
        "brand": "Zara",
        "type": "outerwear",
        "categories": ["baggy", "luxury"],
        "aestheticTags": ["relaxed", "fit", "faux", "suede", "jacket"],
        "imageUrl": "https://static.zara.net/assets/public/.../08281600800-e1.jpg",
        "productUrl": "https://www.zara.com/mx/en/relaxed-fit-faux-suede-jacket-p08281600.html",
        "price": 1599,
        "currency": "MXN"
      }
    ]
  }
}
```

Notas:
- Usa Firecrawl con `waitFor` + scroll en el listado; luego visita cada página de producto para obtener `og:image` real.
- Extrae `color`, `colorHex`, `colorHsl`, `colorPalette` analizando la imagen localmente (sin OpenAI).
- `skippedWithoutImage`: productos descartados por falta de imagen válida.
- `source`: `firecrawl` (real) o `mock` (sin `FIRECRAWL_API_KEY`).
- `classifier`: `openai` cuando hay cuota disponible, o `heuristic` (clasificacion por palabras clave) como fallback.
- Batch masivo: `npm run scrape:zara` (10 categorías Zara hombre, límite 40 c/u).

---

## Vision AI Core — Orquestador

### Subir foto del modelo humano

| Campo  | Valor                      |
|--------|----------------------------|
| Método | `POST`                     |
| Ruta   | `/vision/upload-model`     |
| Content-Type | `multipart/form-data` |

#### Body esperado

| Campo          | Tipo   | Requerido | Descripción                                      |
|----------------|--------|-----------|--------------------------------------------------|
| `projectId`    | string | Sí        | ID del proyecto                                  |
| `image`        | file   | Sí        | Foto del modelo humano                           |
| `proportions`  | string | No        | JSON string con override de proporciones         |

Ejemplo de `proportions`:

```json
{
  "height": "tall",
  "shoulderWidth": "broad",
  "torsoLength": "balanced",
  "legRatio": "long"
}
```

Valores válidos: `height` (`petite`|`average`|`tall`), `shoulderWidth` (`narrow`|`average`|`broad`), `torsoLength` (`short`|`balanced`|`long`), `legRatio` (`short`|`balanced`|`long`).

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "projectId": "665a1b2c3d4e5f6789012345",
    "visionAnalysis": {
      "modelImage": { "url": "https://res.cloudinary.com/...", "publicId": "shootai/vision-models/..." },
      "proportions": { "height": "tall", "shoulderWidth": "broad", "torsoLength": "balanced", "legRatio": "balanced" },
      "recommendation": {
        "camera": "Full-frame DSLR",
        "lens": "85mm f/1.4",
        "pose": "Three-quarter angle, weight on back leg",
        "rationale": "Tall frame with broad shoulders benefits from compression and slight angle to soften shoulder line."
      }
    },
    "pipeline": {
      "visionCore": "mock",
      "recommendationEngine": "static-matrix-v1"
    },
    "matchedRuleId": "tall-broad-shoulders"
  }
}
```

#### Respuesta de error — `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "message": "Model image is required"
  }
}
```

---

## WhatsApp Webhook — n8n Bridge

### Recibir evento entrante

| Campo  | Valor                   |
|--------|-------------------------|
| Método | `POST`                  |
| Ruta   | `/whatsapp/webhook`     |

#### Body esperado

```json
{
  "projectId": "665a1b2c3d4e5f6789012345",
  "from": "+5215512345678",
  "type": "message",
  "message": {
    "text": "Hola, quiero mi asesoría de imagen"
  }
}
```

| Campo       | Tipo   | Requerido | Descripción                              |
|-------------|--------|-----------|------------------------------------------|
| `projectId` | string | No        | Si se envía, persiste el evento en el proyecto |
| `from`      | string | No        | Número o ID del remitente                |
| `type`      | string | No        | Tipo de evento (`message`, `status`, etc.) |
| `message`   | object | No        | Payload del mensaje                      |

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "received": true,
    "projectId": "665a1b2c3d4e5f6789012345",
    "event": {
      "direction": "inbound",
      "from": "+5215512345678",
      "type": "message",
      "payload": { "message": { "text": "Hola, quiero mi asesoría de imagen" } }
    },
    "n8n": {
      "forwarded": false,
      "source": "mock",
      "data": { "note": "Mock n8n forward — set N8N_WEBHOOK_URL to connect real workflow" }
    }
  }
}
```

---

### Enviar mensaje saliente

| Campo  | Valor               |
|--------|---------------------|
| Método | `POST`              |
| Ruta   | `/whatsapp/send`    |

#### Body esperado

```json
{
  "projectId": "665a1b2c3d4e5f6789012345",
  "to": "+5215512345678",
  "type": "message",
  "payload": {
    "text": "Tu sesión de asesoría está lista. Revisa tu blueprint aquí: https://app.shootai.com/session/123"
  }
}
```

| Campo       | Tipo   | Requerido | Descripción                    |
|-------------|--------|-----------|--------------------------------|
| `to`        | string | Sí        | Destinatario                   |
| `projectId` | string | No        | Proyecto asociado              |
| `type`      | string | No        | Tipo de mensaje                |
| `payload`   | object | No        | Contenido del mensaje          |

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "sent": true,
    "projectId": "665a1b2c3d4e5f6789012345",
    "event": {
      "direction": "outbound",
      "from": "system",
      "type": "message",
      "payload": { "to": "+5215512345678", "text": "Tu sesión de asesoría está lista..." }
    },
    "n8n": {
      "forwarded": false,
      "source": "mock"
    }
  }
}
```

#### Respuesta de error — `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "message": "Recipient \"to\" is required"
  }
}
```

---

### Enviar resumen del análisis (Generador de Respuestas Estructuradas)

Toma el `visionAnalysis` y los `recommendedGarments` del proyecto y arma un mensaje amigable + una plantilla estructurada, listos para responder por WhatsApp (vía n8n).

| Campo  | Valor                      |
|--------|----------------------------|
| Método | `POST`                     |
| Ruta   | `/whatsapp/send-analysis`  |

#### Body esperado

```json
{
  "projectId": "665a1b2c3d4e5f6789012345",
  "to": "+5215512345678"
}
```

| Campo       | Tipo   | Requerido | Descripción         |
|-------------|--------|-----------|---------------------|
| `projectId` | string | Sí        | ID del proyecto     |
| `to`        | string | Sí        | Destinatario        |

#### Respuesta de éxito — `200 OK`

```json
{
  "success": true,
  "data": {
    "sent": true,
    "projectId": "665a1b2c3d4e5f6789012345",
    "message": "Proyecto: Editorial Cyberpunk\nModelo analizado con exito. Ficha de composicion:\n- Camara: Full-frame DSLR\n- Lente: 85mm f/1.4\n- Pose recomendada: Three-quarter angle, weight on back leg\n\nLooks curados (8):\n1. Neon Mesh Bodysuit - Mugler",
    "template": {
      "projectId": "665a1b2c3d4e5f6789012345",
      "projectName": "Editorial Cyberpunk",
      "status": "ready",
      "vision": {
        "camera": "Full-frame DSLR",
        "lens": "85mm f/1.4",
        "pose": "Three-quarter angle, weight on back leg",
        "rationale": "...",
        "proportions": { "height": "tall", "shoulderWidth": "broad" }
      },
      "looks": [
        { "name": "Neon Mesh Bodysuit", "brand": "Mugler", "type": "top", "imageUrl": "https://...", "productUrl": "https://..." }
      ]
    },
    "n8n": { "forwarded": false, "source": "mock" }
  }
}
```

#### Respuesta de error — `400 Bad Request`

```json
{ "success": false, "error": { "message": "projectId is required" } }
```

---

## Respuestas globales

### Ruta no encontrada — `404 Not Found`

```json
{
  "success": false,
  "error": {
    "message": "Route GET /api/ruta-inexistente not found"
  }
}
```

### Error interno del servidor — `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "message": "Internal Server Error"
  }
}
```

---

## Variables de entorno

| Variable                    | Requerida | Descripción                              |
|-----------------------------|-----------|------------------------------------------|
| `PORT`                      | No        | Puerto del servidor (default: 3000)      |
| `SUPABASE_URL`              | Sí        | URL del proyecto Supabase                |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí*       | Service role key (preferida en backend)  |
| `SUPABASE_ANON_KEY`         | Sí*       | Anon key (fallback si no hay service key)|
| `OPENAI_API_KEY`            | No        | OpenAI para extracción de categorías     |
| `OPENAI_MODEL`              | No        | Modelo OpenAI (default: `gpt-4o-mini`)   |
| `FIRECRAWL_API_KEY`         | No        | Firecrawl para scraping de catálogo      |
| `CLOUDINARY_CLOUD_NAME`     | Sí**      | Cloud name de Cloudinary                 |
| `CLOUDINARY_API_KEY`        | Sí**      | API key de Cloudinary                    |
| `CLOUDINARY_API_SECRET`     | Sí**      | API secret de Cloudinary                 |
| `LLM_API_URL`               | No        | URL alternativa LLM (override OpenAI)    |
| `LLM_API_KEY`               | No        | API key del LLM alternativo              |
| `VISION_CORE_URL`           | No        | URL del Core de Visión (YOLO/MediaPipe)  |
| `N8N_WEBHOOK_URL`           | No        | Webhook de n8n para WhatsApp             |
| `DEMO_EMPRESA_ID`           | No        | UUID de la empresa demo para `/style-match` y `/requirements` cuando no se envía `empresaId` |
| `SHOOT_MODEL_URL`           | No        | URL del modelo de poses/ángulos (placeholder; hoy responde mock) |

\* Al menos una de `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_ANON_KEY` es requerida.

\** Requerida solo para endpoints que suben imágenes (`/creative-dump`, `/style-match`, `/requirements`, `/vision/upload-model`).

---

## Verificación automatizada

Ejecuta `npm run test:endpoints` para validar todos los endpoints documentados. Resultados detallados en [`docs/ENDPOINTS_VERIFY.md`](./ENDPOINTS_VERIFY.md).
