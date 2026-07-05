# Guía de Pruebas — ShootAI Server

Esta guía te lleva paso a paso para validar que el backend funciona de punta a punta. Los ejemplos están hechos para **PowerShell** (Windows), que es tu shell. Cada endpoint incluye la versión con `Invoke-RestMethod` (nativo, ideal para JSON) y con `curl.exe` (ideal para subir archivos).

> IMPORTANTE (PowerShell): `curl` es un alias de `Invoke-WebRequest` y NO funciona como el `curl` de Linux. Para los ejemplos de subida de archivos usa siempre `curl.exe` (con `.exe`).

---

## 0. Prerrequisitos

| Requisito | Estado / cómo verificar |
|-----------|-------------------------|
| Node.js | `node -v` (probado con v24) |
| Dependencias | `npm install` (ya instaladas) |
| MongoDB | Local en `localhost:27017` **funciona** (verificado). Atlas es opcional (ver sección 1b) |
| Cloudinary | Requiere `cloud name` correcto — ver sección 1c. **Actualmente bloqueado** |

### Estado verificado de los módulos

| Módulo | Endpoint | Estado en pruebas |
|--------|----------|-------------------|
| Health | `GET /api/health` | Funciona |
| Projects CRUD | `/api/projects` | Funciona |
| Catálogo | `POST/GET /api/catalog` | Funciona (seed con `npm run seed`) |
| Fashion Matcher | `POST /api/fashion-matcher` | Funciona (recomendación por tags) |
| WhatsApp | `POST /api/whatsapp/webhook`, `/send`, `/send-analysis` | Funciona (modo mock) |
| Export | `GET /api/projects/:id/export` | Funciona |
| Creative Dump | `POST /api/creative-dump` | Requiere cuenta Cloudinary activa (upload 403) |
| Vision Core | `POST /api/vision/upload-model` | Requiere cuenta Cloudinary activa (upload 403) |

> Nota Cloudinary: el `cloud name` y las credenciales ya son válidas (el `ping` a la Admin API responde OK), pero el `upload` devuelve `403`. Eso indica una cuenta de Cloudinary sin activar/verificar o con subidas restringidas. En cuanto se active, `/creative-dump` y `/vision/upload-model` funcionan sin tocar código.

---

## 1. Configuración

### 1a. MongoDB local (lo que ya tienes)

Tu `.env` apunta a `mongodb://localhost:27017/shootai` y **conecta correctamente**. No necesitas hacer nada si tienes MongoDB local corriendo.

### 1b. MongoDB Atlas (opcional, para nube)

Si prefieres Atlas:

1. Crea un cluster gratuito M0 en [cloud.mongodb.com](https://cloud.mongodb.com).
2. Crea un usuario de base de datos (Database Access).
3. En **Network Access** añade tu IP (o `0.0.0.0/0` temporal para el hackathon).
4. Copia el connection string y ponlo en `.env`:

```
MONGODB_URI=mongodb+srv://USUARIO:PASSWORD@CLUSTER.mongodb.net/shootai?retryWrites=true&w=majority
```

Notas:
- Incluye el nombre de la base (`/shootai`) antes del `?`.
- Si tu password tiene símbolos (`@`, `#`, `:`), URL-encodéalos (ej. `@` -> `%40`).

### 1c. Cloudinary (ACCIÓN REQUERIDA)

Durante las pruebas, la subida de imágenes falló con:

```json
{ "success": false, "error": { "message": "Cloudinary upload failed: Invalid cloud_name ShootAI" } }
```

Diagnóstico realizado:
- `CLOUDINARY_CLOUD_NAME=ShootAI` (con mayúsculas) -> **cloud name inválido**.
- Probando `shootai` (minúsculas) con tu API key/secret -> **`cloud_name mismatch`**.

Esto significa que **tu `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` pertenecen a una cuenta cuyo cloud name NO es "shootai"**. Debes:

1. Entrar a [console.cloudinary.com](https://console.cloudinary.com).
2. En el Dashboard (Product Environment / Account Details) copiar el **Cloud name exacto** (suele ser minúsculas, a veces autogenerado tipo `dxxxxxxx`).
3. Verificar que `API Key` y `API Secret` sean los de **esa misma** cuenta.
4. Actualizar en `.env`:

```
CLOUDINARY_CLOUD_NAME=tu_cloud_name_real
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

Mientras no se corrija, todos los endpoints funcionan **excepto** `POST /api/creative-dump` y `POST /api/vision/upload-model`.

---

## 2. Arrancar el servidor

```powershell
npm run dev
```

Salida esperada (esto es "funciona"):

```
MongoDB connected successfully
Server running on port 3000
```

Si ves `Failed to start server: ...` -> problema de MongoDB (Atlas: IP no permitida, password, o falta `/shootai`).

Deja esta terminal abierta y abre **otra** para lanzar las pruebas.

---

## 3. Secuencia de pruebas

Ejecuta en orden. El `projectId` del paso 3.2 se reutiliza en el resto.

### 3.1 Health check

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get | ConvertTo-Json -Depth 6
```

Respuesta esperada (funciona):

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 599.13,
    "timestamp": "2026-07-04T21:10:41.390Z",
    "environment": "development"
  }
}
```

### 3.2 Crear proyecto

```powershell
$body = @{ name = "Sesion de prueba" } | ConvertTo-Json
$proj = Invoke-RestMethod -Uri "http://localhost:3000/api/projects" -Method Post -ContentType "application/json" -Body $body
$proj.data._id   # guarda este id
$projectId = $proj.data._id
```

Respuesta esperada (`201`): objeto `Project` con `_id`, `status: "draft"` y subdocumentos vacíos.

> Truco: guardamos el id en `$projectId` para reutilizarlo automáticamente en los siguientes pasos dentro de la misma ventana de PowerShell.

### 3.3 Listar / obtener / actualizar / eliminar

```powershell
# Listar todos
Invoke-RestMethod -Uri "http://localhost:3000/api/projects" -Method Get | ConvertTo-Json -Depth 4

# Obtener por id
Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$projectId" -Method Get | ConvertTo-Json -Depth 6

# Actualizar (nombre / status)
$upd = @{ status = "ready" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$projectId" -Method Patch -ContentType "application/json" -Body $upd | ConvertTo-Json -Depth 6

# Eliminar (NO lo ejecutes todavía si quieres seguir la secuencia)
# Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$projectId" -Method Delete
```

`DELETE` esperado: `{ "success": true, "data": { "message": "Project deleted successfully" } }`.

### 3.4 Catálogo + Fashion Matcher (recomendaciones)

Primero carga el catálogo simulado (una sola vez):

```powershell
npm run seed   # inserta ~15 prendas tipo SSENSE/Farfetch
Invoke-RestMethod -Uri "http://localhost:3000/api/catalog?limit=3" -Method Get | ConvertTo-Json -Depth 6
```

Luego pide recomendaciones para el proyecto. El Matcher cruza las `aestheticTags` del proyecto (que produce el Creative Dump) contra el catálogo:

```powershell
$body = @{ projectId = $projectId; limit = 5 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/fashion-matcher" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```

Criterio de éxito: `recommendedGarments` con `score` y `matchedTags`. Si el proyecto aún no tiene `aestheticTags`, todos vienen con `score: 0` (se devuelven igual como fallback). Ejemplo con tags `cyberpunk/futuristic/neon`:

```json
{
  "success": true,
  "data": {
    "projectId": "...",
    "basedOnTags": ["cyberpunk", "futuristic", "neon", "urban"],
    "count": 5,
    "recommendedGarments": [
      { "name": "Neon Mesh Bodysuit", "brand": "Mugler", "type": "top", "score": 4, "matchedTags": ["cyberpunk", "futuristic", "neon", "urban"] },
      { "name": "Holographic Platform Boots", "brand": "Rombaut", "type": "footwear", "score": 3, "matchedTags": ["cyberpunk", "futuristic", "neon"] }
    ]
  }
}
```

> Las `aestheticTags` normalmente las genera `/creative-dump`. Como ese endpoint depende de Cloudinary, para probar el matching mientras se activa la cuenta puedes inyectar tags al proyecto con un script rápido de Mongo (ver sección 4b).

Si el catálogo está vacío, el endpoint responde `409`:

```json
{ "success": false, "error": { "message": "Catalog is empty. Load garments via POST /api/catalog (or run npm run seed) first" } }
```

### 3.5 WhatsApp — evento entrante (mock)

```powershell
$body = @{ projectId = $projectId; from = "+5215512345678"; type = "message"; message = @{ text = "Hola, quiero mi asesoria" } } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp/webhook" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```

Criterio de éxito: `received: true`, evento con `direction: "inbound"`, y `n8n.source: "mock"` (aún sin `N8N_WEBHOOK_URL`).

### 3.6 WhatsApp — mensaje saliente (mock)

```powershell
$body = @{ projectId = $projectId; to = "+5215512345678"; type = "message"; payload = @{ text = "Tu sesion esta lista" } } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp/send" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```

Criterio de éxito: `sent: true`, `direction: "outbound"`, `n8n.source: "mock"`.

### 3.6b WhatsApp — Resumen del análisis (Generador de Respuestas Estructuradas)

Convierte el `visionAnalysis` + `recommendedGarments` del proyecto en un mensaje amigable listo para WhatsApp:

```powershell
$body = @{ projectId = $projectId; to = "+50212345678" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp/send-analysis" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```

Criterio de éxito: `sent: true` y un campo `message` con texto tipo:

```
Proyecto: Editorial Cyberpunk
Modelo analizado con exito. Ficha de composicion:
- Camara: Full-frame DSLR
- Lente: 85mm f/1.4
- Pose recomendada: Three-quarter angle, weight on back leg

Looks curados (4):
1. Neon Mesh Bodysuit - Mugler
```

Además devuelve `template` (objeto estructurado con `vision` y `looks`) para que el frontend/n8n lo use directamente.

### 3.7 Creative Dump (subida de imágenes — requiere Cloudinary OK)

Primero crea una imagen de prueba (PowerShell):

```powershell
$b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
[IO.File]::WriteAllBytes("$PWD\test-image.png", [Convert]::FromBase64String($b64))
```

Súbela con `curl.exe` (el multipart es más fiable así en Windows):

```powershell
curl.exe -s -X POST "http://localhost:3000/api/creative-dump" `
  -F "projectId=$projectId" `
  -F "freeText=Editorial minimal luxury con tonos pastel" `
  -F "images=@test-image.png;type=image/png"
```

- Si Cloudinary está **bien configurado**, esperado: `pipeline.storage: "cloudinary"`, `pipeline.llm: "mock"` y URLs `https://res.cloudinary.com/...`, más `aestheticTags` generados.
- Con el estado **actual** (cloud name incorrecto), obtendrás:

```json
{ "success": false, "error": { "message": "Cloudinary upload failed: Invalid cloud_name ShootAI" } }
```

### 3.8 Vision AI Core — upload-model (requiere Cloudinary OK)

```powershell
curl.exe -s -X POST "http://localhost:3000/api/vision/upload-model" `
  -F "projectId=$projectId" `
  -F "image=@test-image.png;type=image/png"
```

- Con Cloudinary OK, esperado: `visionAnalysis.recommendation` con `camera`, `lens`, `pose`, `rationale` y `matchedRuleId` (la matriz estática). Como antes hiciste Fashion Matcher con una prenda `tailored`, la regla `tailored-garment` puede activarse.
- Con el estado actual: mismo error de Cloudinary que arriba.

#### Enviar `proportions` (opcional) — cuidado con el escape en PowerShell

El campo `proportions` es un JSON dentro de un form multipart. En PowerShell las comillas se escapan mal fácilmente (verás `proportions must be a valid JSON object`). Forma fiable:

```powershell
$prop = '{"height":"tall","shoulderWidth":"broad"}'
curl.exe -s -X POST "http://localhost:3000/api/vision/upload-model" `
  -F "projectId=$projectId" `
  -F "image=@test-image.png;type=image/png" `
  -F "proportions=$prop"
```

Valores válidos: `height` (`petite|average|tall`), `shoulderWidth` (`narrow|average|broad`), `torsoLength` (`short|balanced|long`), `legRatio` (`short|balanced|long`).

Limpieza al terminar:

```powershell
Remove-Item test-image.png
```

### 3.9 Export consolidado

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$projectId/export" -Method Get | ConvertTo-Json -Depth 10
```

Criterio de éxito: un JSON único con `creativeDump`, `recommendedGarments`, `visionAnalysis`, `whatsappEvents` y `exportedAt`. Tras la secuencia anterior verás `recommendedGarments` y `whatsappEvents` poblados (y `creativeDump`/`visionAnalysis` poblados también si Cloudinary funciona).

---

## 4b. Probar sin Cloudinary (inyectar datos para el demo)

Mientras se activa la cuenta de Cloudinary, puedes inyectar directamente en Mongo los datos que normalmente producen `/creative-dump` y `/vision/upload-model`, para validar el resto del flujo (recomendaciones + WhatsApp):

```powershell
# Inyectar aestheticTags (simula Creative Dump)
node -e "require('dotenv').config(); const m=require('mongoose'); const P=require('./src/models/project.model'); (async()=>{ await m.connect(process.env.MONGODB_URI); await P.findByIdAndUpdate(process.argv[1],{'creativeDump.aestheticTags':['cyberpunk','futuristic','neon','urban']}); console.log('tags ok'); await m.connection.close(); })()" $projectId

# Inyectar visionAnalysis (simula upload-model)
node -e "require('dotenv').config(); const m=require('mongoose'); const P=require('./src/models/project.model'); (async()=>{ await m.connect(process.env.MONGODB_URI); await P.findByIdAndUpdate(process.argv[1],{status:'ready','visionAnalysis.recommendation':{camera:'Full-frame DSLR',lens:'85mm f/1.4',pose:'Three-quarter angle',rationale:'demo'}}); console.log('vision ok'); await m.connection.close(); })()" $projectId
```

Después corre el Matcher (3.4) y `send-analysis` (3.6b) para ver el flujo completo.

---

## 4. Casos de error (para validar el manejo de errores)

| Prueba | Comando | Respuesta esperada |
|--------|---------|--------------------|
| projectId inválido | `Invoke-RestMethod ".../api/projects/123invalid"` | `400` `{ "message": "Invalid projectId" }` |
| Proyecto inexistente | `.../api/projects/6a4976d1d74201ba6d24f3ff` (id válido pero no existe) | `404` `{ "message": "Project not found" }` |
| Falta `to` en send | `POST /api/whatsapp/send` sin `to` | `400` `{ "message": "Recipient \"to\" is required" }` |
| Ruta inexistente | `GET /api/ruta-inexistente` | `404` `{ "message": "Route GET /api/ruta-inexistente not found" }` |

Ejemplo para capturar el error en PowerShell (los `catch` muestran el body):

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/projects/123invalid" -Method Get
} catch {
  Write-Output "STATUS: $($_.Exception.Response.StatusCode.value__)"
  $_.ErrorDetails.Message
}
```

---

## 5. Tabla de diagnóstico (síntoma -> causa -> solución)

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `Failed to start server` al hacer `npm run dev` | Mongo no accesible | Local: inicia el servicio MongoDB. Atlas: revisa IP en Network Access, password y `/shootai` en la URI |
| `Cloudinary upload failed: Invalid cloud_name X` | Cloud name mal escrito | Copia el cloud name exacto del dashboard (sección 1c) |
| `cloud_name mismatch` | API key/secret son de otra cuenta | Usa las credenciales de la MISMA cuenta que el cloud name |
| `Cloudinary upload failed: ... 403` | Cuenta Cloudinary sin activar/verificar o subidas restringidas (el `ping` funciona pero el upload no) | Verifica el correo/activa la cuenta en el dashboard de Cloudinary |
| `503 Cloudinary is not configured` | Falta alguna var `CLOUDINARY_*` | Completa las 3 variables en `.env` y reinicia |
| `409 Catalog is empty` | No hay prendas en el catálogo | Corre `npm run seed` o carga prendas con `POST /api/catalog` |
| `400 Invalid projectId` | Id mal formado | Usa el `_id` exacto que devolvió crear proyecto |
| `404 Project not found` | Id válido pero borrado/inexistente | Crea un proyecto nuevo |
| `proportions must be a valid JSON object` | Escape de comillas en PowerShell | Usa la técnica de la sección 3.8 (`$prop = '...'`) |
| Respuestas con `"source": "mock"` | Servicios externos sin configurar | Es normal. Configura `LLM_API_URL`, `VISION_CORE_URL`, `N8N_WEBHOOK_URL` cuando estén listos |

---

## 6. Resumen: ¿qué debe funcionar hoy?

Sin tocar nada más (con Mongo local + `npm run seed`):

- Health, Projects (CRUD + export), Catálogo, Fashion Matcher (recomendaciones), WhatsApp (webhook/send/send-analysis) -> **funcionan** (verificado en vivo).
- Creative Dump y Vision upload-model -> **funcionarán en cuanto la cuenta de Cloudinary esté activa** (hoy el upload devuelve `403`; ver nota de la sección de estado).

Todo lo marcado como `"source": "mock"` es el comportamiento esperado hasta que se conecten los servicios externos reales (LLM, Vision Core, n8n).
