# Creador de Flyers - Ahora Nacion

Editor web para crear flyers verticales de campana, con plantillas para Facebook y TikTok.

## Requisitos

- Node.js 20 o superior
- Docker Desktop
- PowerShell, CMD o una terminal compatible

## Estructura

```text
.
+-- backend/        API Express, Prisma, PostgreSQL y carga de archivos
+-- frontend/       Aplicacion React + Vite
+-- docker-compose.yml
`-- package.json    Scripts para ejecutar ambos proyectos desde la raiz
```

## Responsabilidades

Backend:

- Expone la API HTTP con Express.
- Valida proyectos, formatos, dimensiones y archivos.
- Persiste datos en PostgreSQL mediante Prisma.
- Guarda y sirve archivos subidos desde `/uploads`.

Frontend:

- Renderiza el editor y la vista previa del flyer.
- Gestiona el estado visual del lienzo, estilos, textos y encuadre.
- Consume la API del backend desde `frontend/src/api.ts`.
- Centraliza plantillas, estilos y constantes en `frontend/src/config.ts`.
- Comparte tipos de UI en `frontend/src/types.ts`.

Vite usa `@vitejs/plugin-react` y `vite-tsconfig-paths` para React y aliases `@/`.

## Puesta en marcha completa

Desde la raiz del proyecto:

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
docker compose up -d
npm run db:generate
npm run db:push
npm run dev
```

Luego abre:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/api/health`

## Scripts desde la raiz

```powershell
npm run install:all   # instala dependencias de raiz, backend y frontend
npm run dev           # ejecuta backend y frontend en modo desarrollo
npm run start         # ejecuta el backend compilado
npm run db:generate   # genera el cliente de Prisma
npm run db:push       # sincroniza el schema de Prisma con PostgreSQL
```

## Backend

Ubicacion: `backend/`

### Variables de entorno

Copia `backend/.env.example` a `backend/.env`.

```env
PORT=4000
DATABASE_URL="postgresql://flayer:flayer@localhost:5433/flayer?schema=public"
UPLOAD_DIR="uploads"
CORS_ORIGIN="http://localhost:5173"
```

### Base de datos

El proyecto usa PostgreSQL 16 con Docker. El servicio queda publicado en el puerto local `5433`.

```powershell
docker compose up -d
npm --prefix backend run db:generate
npm --prefix backend run db:push
```

Los comandos `dev` y `build` del backend ejecutan `prisma generate` automaticamente antes de iniciar o compilar. Esto genera tipos y cliente de Prisma, pero no modifica la base de datos. Para aplicar el schema usa `db:push`.

### Comandos del backend

```powershell
npm --prefix backend run dev       # API en modo watch con tsx
npm --prefix backend run build     # compila TypeScript a dist/
npm --prefix backend start         # ejecuta dist/server.js
npm --prefix backend run db:generate
npm --prefix backend run db:push
```

Al iniciar correctamente debe aparecer:

```text
Flayer API running on http://localhost:4000
```

Si el puerto `4000` queda ocupado en Windows:

```powershell
$backendProcessId = (Get-NetTCPConnection -LocalPort 4000 -State Listen).OwningProcess
Stop-Process -Id $backendProcessId -Force
```

### API

- `GET /api/health`: comprueba que la API esta activa.
- `GET /api/projects`: lista proyectos con archivos.
- `GET /api/projects/:id`: recupera un proyecto con archivos.
- `POST /api/projects`: crea un proyecto.
- `PATCH /api/projects/:id`: actualiza campos editables.
- `POST /api/projects/:id/assets`: sube un archivo multipart en el campo `file`.

Campos editables de proyecto:

- `name`
- `format`: `facebook`, `tiktok` o `story`
- `mode`: `minimal`, `optimized`, `diagonal`, `editorial` o `soft`
- `width`
- `height`
- `config`

Validaciones principales:

- Facebook usa `1080 x 1350` y acepta imagenes JPG, PNG o WebP.
- TikTok usa `1080 x 1920` y acepta videos MP4 o WebM.
- Los archivos pueden pesar hasta `100 MB`.
- Los archivos subidos se sirven desde `/uploads`.
- Los errores se devuelven como JSON con la forma `{ "error": "mensaje" }`.

## Frontend

Ubicacion: `frontend/`

### Variables de entorno

Copia `frontend/.env.example` a `frontend/.env`.

```env
VITE_API_URL=http://localhost:4000
```

### Comandos del frontend

```powershell
npm --prefix frontend run dev      # Vite en http://localhost:5173
npm --prefix frontend run build    # typecheck y build de produccion
```

### Funciones de la interfaz

- Plantilla Facebook: imagen `1080 x 1350` en formato `4:5`.
- Plantilla TikTok: video `1080 x 1920` en formato `9:16`.
- Estilos: `Minimal`, `Optimizada`, `Diagonal`, `Editorial` y `Tarjeta`.
- Edicion de titular, tratamiento, cargo, descripcion, lema, distrito y color de acento.
- Carga de imagenes para Facebook y videos para TikTok.
- Encuadre de imagen con arrastre, controles horizontal/vertical, zoom y restablecer.
- Persistencia de proyecto, textos, plantilla, estilo, color, archivo y encuadre.
- Descarga PNG para la plantilla Facebook.

## Flujo recomendado de desarrollo

1. Levanta PostgreSQL con `docker compose up -d`.
2. Sincroniza Prisma con `npm run db:push`.
3. Ejecuta todo con `npm run dev`.
4. Edita el frontend en `frontend/src/`.
5. Edita la API en `backend/src/`.
6. Antes de entregar cambios, valida con:

```powershell
npm --prefix backend run build
npm --prefix frontend run build
```
