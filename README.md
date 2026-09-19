# Creador de Flyers - Ahora Nacion

Editor web para crear flyers verticales de campana, con plantillas para Facebook y TikTok.

## Requisitos

- Node.js 20 o superior
- Docker Desktop
- PowerShell, CMD o una terminal compatible

En Ubuntu/Debian puedes preparar el servidor con:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker "$USER"
```

Despues de agregar tu usuario al grupo `docker`, cierra sesion y vuelve a entrar.

## Estructura

```text
.
+-- backend/        API Express, Prisma, PostgreSQL, Redis y carga de archivos
+-- frontend/       Aplicacion React + Vite
+-- docker-compose.yml
`-- package.json    Scripts para ejecutar ambos proyectos desde la raiz
```

## Responsabilidades

Backend:

- Expone la API HTTP con Express.
- Valida proyectos, formatos, dimensiones y archivos.
- Persiste datos en PostgreSQL mediante Prisma.
- Usa Redis para rate limit compartido entre procesos y locks cortos por proyecto.
- Guarda y sirve archivos subidos desde `/uploads`.

Frontend:

- Renderiza el editor y la vista previa del flyer.
- Gestiona el estado visual del lienzo, estilos, textos y encuadre.
- Consume la API del backend desde `frontend/src/api.ts`.
- Centraliza plantillas, estilos y constantes en `frontend/src/config.ts`.
- Comparte tipos de UI en `frontend/src/types.ts`.

Vite usa `@vitejs/plugin-react` y `vite-tsconfig-paths` para React y aliases `@/`.

## Clonar desde Git

Antes de iniciar, clona el repositorio y entra a la carpeta del proyecto:

```powershell
git clone <URL_DEL_REPOSITORIO> flayeerAN
Set-Location flayeerAN
```

Si ya tienes el proyecto clonado, actualiza la rama antes de instalar o compilar:

```powershell
git pull
```

Para repositorios privados usa una llave SSH en lugar de pegar tokens en la documentacion:

```bash
ssh-keygen -t ed25519 -C "tu-correo@example.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

Copia la llave publica en GitHub: <https://github.com/settings/keys>.

## Puesta en marcha local

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
- Healthcheck: `http://localhost:4000/api/health` devuelve estado de PostgreSQL y Redis.

Si estas en Windows y `prisma generate` falla con `EPERM` al renombrar `query_engine-windows.dll.node`, detiene cualquier backend activo de este proyecto y vuelve a ejecutar el comando:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Select-Object ProcessId, CommandLine
Stop-Process -Id <ID_DEL_BACKEND> -Force
npm run db:generate
```

## Scripts desde la raiz

```powershell
npm run install:all   # instala dependencias de raiz, backend y frontend
npm run dev           # ejecuta backend y frontend en modo desarrollo
npm run build         # compila backend y frontend
npm run start         # ejecuta el backend compilado
npm run infra:up      # levanta PostgreSQL y Redis con Docker
npm run infra:down    # detiene la infraestructura Docker
npm run db:generate   # genera el cliente de Prisma
npm run db:push       # sincroniza el schema de Prisma con PostgreSQL
npm run pm2:start     # inicia backend y frontend preview con PM2
npm run pm2:reload    # recarga PM2 tomando variables actualizadas
npm run pm2:stop      # detiene las apps PM2
npm run pm2:logs      # muestra logs PM2
```

## Backend

Ubicacion: `backend/`

### Variables de entorno

Copia `backend/.env.example` a `backend/.env`.

```env
# Backend
PORT=4000
APP_BASE_URL="http://localhost:4000"

# Frontend permitido por CORS
FRONTEND_BASE_URL="http://localhost:5173"
FRONTEND_PREVIEW_URL="http://localhost:4173"
CORS_ORIGIN="http://localhost:5173,http://localhost:4173"

# PostgreSQL
DATABASE_URL="postgresql://flayer:flayer@localhost:5433/flayer?schema=public"

# Redis
REDIS_URL="redis://localhost:6380"
REDIS_REQUIRED=false
PROJECT_LOCK_MS=300000

# Archivos subidos
UPLOAD_DIR="uploads"
```

Para produccion usa como base `backend/.env.production.example`. Ajusta:

- `APP_BASE_URL` a la URL publica real del backend.
- `FRONTEND_BASE_URL` a la URL publica real del frontend.
- `FRONTEND_PREVIEW_URL` solo si sirves un preview adicional; en produccion normalmente puede quedar vacio.
- `CORS_ORIGIN` al dominio real del frontend. Acepta varios valores separados por coma o `*` para permitir cualquier origen.
- `DATABASE_URL` con usuario, clave, host, puerto y nombre real de PostgreSQL.
- `REDIS_URL` con el host/puerto real de Redis. Si Redis tiene clave usa `redis://:CLAVE@HOST:PUERTO`.
- `UPLOAD_DIR` a una ruta persistente si no quieres guardar archivos dentro de `backend/uploads`.
- `REDIS_REQUIRED=true` si quieres que la API falle al iniciar cuando Redis no este disponible.

### Base de datos y Redis

El proyecto usa PostgreSQL 16 y Redis 7 con Docker. PostgreSQL queda publicado en `5433` y Redis en `6380` para evitar choque con Redis local.

```powershell
docker compose up -d
npm --prefix backend run db:generate
npm --prefix backend run db:push
```

Los comandos `dev` y `build` del backend ejecutan `prisma generate` automaticamente antes de iniciar o compilar. Esto genera tipos y cliente de Prisma, pero no modifica la base de datos. Para aplicar el schema usa `db:push`.

Redis se usa para:

- Rate limit compartido cuando PM2 corre varias instancias del backend.
- Bloqueo corto por proyecto durante `PATCH /api/projects/:id` y `POST /api/projects/:id/assets`, evitando escrituras simultaneas sobre el mismo proyecto.

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

Si dos sesiones intentan guardar el mismo proyecto al mismo tiempo, la API responde `409` para la segunda escritura con un mensaje para reintentar en unos segundos. La descarga de PNG ocurre en el navegador y no bloquea a otros usuarios.

## Frontend

Ubicacion: `frontend/`

### Variables de entorno

Copia `frontend/.env.example` a `frontend/.env`.

```env
# Backend usado por el navegador en desarrollo
VITE_API_URL=http://localhost:4000

# Ruta base donde se publica el frontend
VITE_BASE_PATH=/
```

Para produccion usa `frontend/.env.production.example` antes de compilar:

- Deja `VITE_API_URL=` vacio si frontend y backend salen por el mismo dominio y tu proxy redirige `/api` y `/uploads` al backend.
- Define `VITE_API_URL=https://api.tu-dominio.com` si el backend vive en otro dominio.
- Cambia `VITE_BASE_PATH=/subcarpeta/` si publicas el frontend dentro de una ruta y no en la raiz del dominio.

Estas variables se leen durante el build de Vite. Si cambias `frontend/.env`, vuelve a ejecutar `npm --prefix frontend run build` antes de recargar PM2.

### Comandos del frontend

```powershell
npm --prefix frontend run dev      # Vite en http://localhost:5173
npm --prefix frontend run build    # typecheck y build de produccion
npm --prefix frontend run preview  # sirve dist/ en http://localhost:4173
```

## Produccion con Docker + PM2

Estos pasos asumen que ya clonaste el proyecto en el servidor y estas dentro de la carpeta del repositorio.

1. Copia y ajusta variables:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.production.example backend/.env
Copy-Item frontend/.env.production.example frontend/.env
```

En Linux:

```bash
cp .env.example .env
cp backend/.env.production.example backend/.env
cp frontend/.env.production.example frontend/.env
nano .env
nano backend/.env
nano frontend/.env
```

2. Levanta PostgreSQL y Redis:

```powershell
npm run infra:up
```

3. Instala, aplica schema y compila:

```powershell
npm run install:all
npm run db:generate
npm run db:push
npm run build
```

4. Inicia con PM2:

```powershell
npm run pm2:start
npm run pm2:logs
```

Por defecto PM2 levanta:

- `flayer-api`: backend compilado en cluster con 2 instancias.
- `flayer-frontend`: `vite preview` sirviendo `frontend/dist` en el puerto `4173`.

Para cambiar la cantidad de procesos del backend o el puerto del preview, edita `.env` en la raiz:

```env
API_INSTANCES=4
FRONTEND_PORT=8080
```

Luego recarga PM2:

```powershell
npm run pm2:reload
```

Para que PM2 recuerde los procesos tras reiniciar el servidor:

```bash
npm exec -- pm2 save
npm exec -- pm2 startup
```

Copia y ejecuta el comando que imprime `pm2 startup`.

En un servidor publico conviene poner Nginx, Apache o Caddy delante para HTTPS y proxy hacia `localhost:4173` y `localhost:4000`.

Ejemplo conceptual de proxy con un solo dominio:

```text
https://tu-dominio.com/          -> frontend en localhost:4173
https://tu-dominio.com/api       -> backend en localhost:4000/api
https://tu-dominio.com/uploads   -> backend en localhost:4000/uploads
```

Con esa forma, el frontend debe compilarse con `VITE_API_URL=` y el backend puede usar `CORS_ORIGIN=https://tu-dominio.com`.

### Nginx con un solo dominio

Ejemplo para publicar frontend, API y archivos subidos bajo el mismo dominio:

```nginx
server {
  server_name tu-dominio.com www.tu-dominio.com;
  client_max_body_size 100M;

  location /api/ {
    proxy_pass http://127.0.0.1:4000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:4000/uploads/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location / {
    proxy_pass http://127.0.0.1:4173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Habilita el sitio y recarga Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/flayeerAN /etc/nginx/sites-enabled/flayeerAN
sudo nginx -t
sudo systemctl reload nginx
```

Para HTTPS:

```bash
sudo snap install --classic certbot
sudo certbot --nginx
```

Con este proxy, usa estos valores de produccion:

```env
# backend/.env
APP_BASE_URL="https://tu-dominio.com"
FRONTEND_BASE_URL="https://tu-dominio.com"
FRONTEND_PREVIEW_URL=
CORS_ORIGIN="https://tu-dominio.com,https://www.tu-dominio.com"

# frontend/.env
VITE_API_URL=
VITE_BASE_PATH=/
```

Si usas subdominios separados, por ejemplo `api.tu-dominio.com` y `app.tu-dominio.com`, compila el frontend con `VITE_API_URL=https://api.tu-dominio.com` y configura `CORS_ORIGIN=https://app.tu-dominio.com`.

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
