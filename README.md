# Creador de Flyers - Ahora Nacion

Editor web para crear flyers verticales de campana, con frontend React/Vite y backend Express/Prisma.

## Deploy Ubuntu 22.x

Esta guia publica:

- Frontend: `https://ahoranacion.online` y `https://www.ahoranacion.online`
- Backend/API: `https://api.ahoranacion.online`
- Servidor/IP: `34.132.12.127`
- Repositorio: `https://github.com/lovito99/flayeerAN.git`

DNS esperado en Namecheap:

```text
A      @     34.132.12.127
A      api   34.132.12.127
CNAME  www   ahoranacion.online.
```

## 1. Instalar dependencias del servidor

```bash
sudo apt update && sudo apt upgrade -y
sudo apt-get install -y git curl wget unzip build-essential nginx ca-certificates
```

Instala Node.js 20 y verifica versiones:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

Instala Docker y habilita tu usuario:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker "$USER"
```

Cierra sesion y vuelve a entrar para que el grupo `docker` tenga efecto. Luego valida:

```bash
docker --version
docker compose version
```

## 2. Clonar el proyecto

```bash
cd ~
git clone https://github.com/lovito99/flayeerAN.git
cd flayeerAN
```

Si el repositorio fuera privado, configura una llave SSH y agregala en GitHub:

```bash
ssh-keygen -t ed25519 -C "tu-correo@example.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

GitHub Keys: <https://github.com/settings/keys>

## 3. Crear archivos .env de produccion

### Raiz del proyecto

```bash
cp .env.example .env
nano .env
```

Contenido recomendado:

```env
API_INSTANCES=2
FRONTEND_PORT=4173
```

### Backend

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Contenido para `backend/.env`:

```env
PORT=4000
APP_BASE_URL="https://api.ahoranacion.online"
FRONTEND_BASE_URL="https://ahoranacion.online"

DATABASE_URL="postgresql://flayer:flayer@localhost:5433/flayer?schema=public"

REDIS_URL="redis://localhost:6380"
REDIS_REQUIRED=true
PROJECT_LOCK_MS=300000

UPLOAD_DIR="/var/www/flayeerAN/uploads"
```

### Frontend

```bash
cp frontend/.env.example frontend/.env
nano frontend/.env
```

Contenido para `frontend/.env`:

```env
VITE_API_URL=https://api.ahoranacion.online
VITE_BASE_PATH=/
```

## 4. Preparar carpeta de uploads

```bash
sudo mkdir -p /var/www/flayeerAN/uploads
sudo chown -R "$USER":"$USER" /var/www/flayeerAN
```

## 5. Levantar PostgreSQL y Redis

El proyecto ya trae `docker-compose.yml` con PostgreSQL 16 y Redis 7.

```bash
docker compose up -d
docker compose ps
```

PostgreSQL queda en `localhost:5433` y Redis en `localhost:6380`.

## 6. Instalar, compilar y preparar base de datos

Desde la raiz del proyecto:

```bash
npm run install:all
npm run db:generate
npm run db:push
npm run build
```

## 7. Iniciar con PM2

```bash
npm run pm2:start
npm run pm2:logs
```

Procesos esperados:

- `flayer-api`: backend en `localhost:4000`
- `flayer-frontend`: frontend preview en `localhost:4173`

Valida:

```bash
curl http://localhost:4000/api/health
curl -I http://localhost:4173
```

Guardar procesos y habilitar arranque automatico:

```bash
npm exec -- pm2 save
npm exec -- pm2 startup
```

Copia y ejecuta el comando que imprime `pm2 startup`.

## 8. Configurar Nginx

Remueve el sitio por defecto si existe:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

### Backend

```bash
sudo nano /etc/nginx/sites-available/flayeerAN-api
```

Contenido:

```nginx
server {
  server_name api.ahoranacion.online;
  client_max_body_size 100M;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### Frontend

```bash
sudo nano /etc/nginx/sites-available/flayeerAN-frontend
```

Contenido:

```nginx
server {
  server_name ahoranacion.online www.ahoranacion.online;

  location / {
    proxy_pass http://127.0.0.1:4173;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Habilita ambos sitios:

```bash
sudo ln -s /etc/nginx/sites-available/flayeerAN-api /etc/nginx/sites-enabled/flayeerAN-api
sudo ln -s /etc/nginx/sites-available/flayeerAN-frontend /etc/nginx/sites-enabled/flayeerAN-frontend
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Activar HTTPS con Certbot

```bash
sudo snap install --classic certbot
sudo certbot --nginx -d ahoranacion.online -d www.ahoranacion.online -d api.ahoranacion.online
```

Valida:

```bash
curl https://api.ahoranacion.online/api/health
```

Abre:

- `https://ahoranacion.online`
- `https://www.ahoranacion.online`
- `https://api.ahoranacion.online/api/health`

## 10. Actualizar una instalacion existente

```bash
cd ~/flayeerAN
git pull
npm run install:all
npm run db:push
npm run build
npm run pm2:reload
npm exec -- pm2 save
```

## Comandos utiles

```bash
npm run pm2:logs
npm run pm2:reload
npm run pm2:stop
docker compose ps
docker compose logs -f
```

## Desarrollo local

En local, usa estos valores.

`backend/.env`:

```env
PORT=4000
APP_BASE_URL="http://localhost:4000"
FRONTEND_BASE_URL="http://localhost:5173"
DATABASE_URL="postgresql://flayer:flayer@localhost:5433/flayer?schema=public"
REDIS_URL="redis://localhost:6380"
REDIS_REQUIRED=false
PROJECT_LOCK_MS=300000
UPLOAD_DIR="uploads"
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_BASE_PATH=/
```

Arranque local:

```bash
npm run install:all
docker compose up -d
npm run db:push
npm run dev
```

URLs locales:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/api/health`
