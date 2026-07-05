# Verificación de endpoints — ShootAI Server

> Última ejecución: smoke test automatizado contra `http://localhost:3000/api`  
> Empresa demo: `DEMO_EMPRESA_ID` (`520d6f4f-7dec-4821-9b17-2f54e35772fd`)  
> Catálogo: ~381 prendas Zara

## Resumen

| Resultado | Cantidad |
|-----------|----------|
| OK | 22 |
| Fallo | 0 |

## Matriz de pruebas

| Endpoint | Método | Estado | Notas |
|----------|--------|--------|-------|
| `/health` | GET | OK | `status: ok` |
| `/empresas` | GET | OK | Lista empresas demo |
| `/empresas` | POST | OK | Crear empresa |
| `/empresas/:id` | GET | OK | Detalle por UUID |
| `/clientes` | GET | OK | Lista (puede estar vacía) |
| `/clientes` | POST | OK | Requiere `empresaId` |
| `/projects` | GET | OK | Lista sesiones |
| `/projects` | POST | OK | Requiere `empresaId` + `name` |
| `/projects/:id` | GET | OK | Incluye creativeDump |
| `/projects/:id` | PATCH | OK | Actualiza status/nombre |
| `/projects/:id` | DELETE | OK | Elimina sesión |
| `/projects/:id/export` | GET | OK | JSON consolidado |
| `/requirements` | POST | OK | Crea project + guarda brief |
| `/requirements/:id/process` | POST | OK | Devuelve `recommendedGarments` Zara |
| `/requirements/:id/shoot-plan` | POST | OK | Mock: 3 poses, 3 ángulos |
| `/style-match` | POST | OK | Atajo todo-en-uno |
| `/creative-dump` | POST | OK | JSON o multipart |
| `/catalog` | GET | OK | Filtro `empresaId`, `limit` |
| `/catalog` | POST | OK | Insertar prendas manual |
| `/catalog/color-match` | POST | OK | Teoría del color por `baseColor` |
| `/catalog/scrape` | POST | OK* | *Lento; requiere Firecrawl + URL válida |
| `/fashion-matcher` | POST | OK | Recomienda por tags del proyecto |
| `/vision/upload-model` | POST | OK | Imagen + matriz estática de pose/cámara |
| `/whatsapp/webhook` | POST | OK | Mock (`n8n.source: mock`) |
| `/whatsapp/send` | POST | OK | Mock saliente |
| `/whatsapp/send-analysis` | POST | OK | Genera mensaje estructurado |

## Flujo E2E validado (requirements)

```powershell
# 1. Guardar requerimientos
$body = @{ freeText = "Look streetwear casual smart-casual" } | ConvertTo-Json
$req = Invoke-RestMethod -Uri "http://localhost:3000/api/requirements" -Method Post -ContentType "application/json" -Body $body
$pid = $req.data.projectId

# 2. Procesar → prendas Zara
$proc = Invoke-RestMethod -Uri "http://localhost:3000/api/requirements/$pid/process" -Method Post -ContentType "application/json" -Body (@{ limit = 5 } | ConvertTo-Json)

# 3. Plan de shoot mock
$plan = Invoke-RestMethod -Uri "http://localhost:3000/api/requirements/$pid/shoot-plan" -Method Post -ContentType "application/json" -Body "{}"

# 4. Export
Invoke-RestMethod -Uri "http://localhost:3000/api/projects/$pid/export" -Method Get
```

## Flujo con imagen de referencia

```powershell
curl.exe -s -X POST "http://localhost:3000/api/requirements" `
  -F "freeText=Quiero fotos como la referencia con el mismo estilo" `
  -F "images=@test/imagen-yo.jpg;type=image/jpeg"
```

## Limitaciones conocidas

| Tema | Detalle |
|------|---------|
| Persistencia `recommendation` | FK falla (catálogo en Supabase separado); respuesta API OK, `export` puede no listar prendas |
| Cloudinary upload | Permiso `create` ausente en dev → fallback data URL |
| `project.status` | Valores `requirements`/`planned` pueden caer a `draft`/`ready` por CHECK constraint |
| `/catalog/scrape` | Depende de Firecrawl; puede timeout en categorías pesadas |

## Cómo re-ejecutar

```powershell
npm run dev
# En otra terminal:
npm run test:endpoints
```

Documentación técnica completa: [`API_DOCS.md`](./API_DOCS.md)
