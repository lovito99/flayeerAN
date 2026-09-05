# Flayer Studio

Editor web para crear flyers verticales optimizados para TikTok e historias sociales.

## Requisitos

- Node.js 20+
- Docker Desktop

## Puesta en marcha

```powershell
npm install
npm run install:all
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
docker compose up -d
npm run db:generate
npm run db:push
npm run dev
```

Abre `http://localhost:5173`.

Para ejecutar el backend manualmente:

```powershell
Set-Location backend
npm run build
npm start
```

Debe aparecer `Flayer API running on http://localhost:4000`. Si el puerto queda ocupado, libera la instancia anterior con:

```powershell
$backendProcessId = (Get-NetTCPConnection -LocalPort 4000 -State Listen).OwningProcess
Stop-Process -Id $backendProcessId -Force
```

## Funciones incluidas

- Lienzo vertical 1080 x 1920 (9:16).
- Modos `Minimal` y `Optimizada`.
- Edicion de titular, descripcion y color de acento.
- Carga de imagenes JPG/PNG y videos MP4 de hasta 100 MB.
- Persistencia de proyectos y metadatos con PostgreSQL y Prisma.
- Exportacion rapida usando la impresion del navegador.

La API corre en `http://localhost:4000`. Los archivos subidos se sirven desde `/uploads`.

## Edicion y API

Guardar persiste todos los textos, el formato, el estilo, el color y el encuadre.
Las siguientes cargas reutilizan el proyecto actual durante la sesion.
El editor muestra los errores de red y de archivo. Admite JPG, PNG, WebP,
MP4 y WebM hasta 100 MB. Imprimir abre el dialogo del navegador; no genera MP4.

- `GET /api/projects`: listar proyectos con archivos.
- `GET /api/projects/:id`: recuperar un proyecto con archivos.
- `POST /api/projects`: crear un proyecto.
- `PATCH /api/projects/:id`: actualizar los campos editables.
- `POST /api/projects/:id/assets`: subir un archivo multipart en `file`.

Los campos editables son `name`, `format`, `mode`, `width`, `height` y `config`.
Los errores devuelven JSON con `error` y un estado HTTP apropiado.
