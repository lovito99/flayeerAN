import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { Prisma, PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 4000);
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
await fs.mkdir(uploadDir, { recursive: true });

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm' } as Record<string, string>)[file.mimetype] || '.bin'}`)
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.mimetype);
    if (!accepted) return callback(new HttpError(415, 'Usa JPG, PNG, WebP, MP4 o WebM'));
    callback(null, true);
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/projects', async (_req, res) => {
  const projects = await prisma.project.findMany({ include: { assets: true }, orderBy: { updatedAt: 'desc' } });
  res.json(projects);
});

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function projectData(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Datos de proyecto inválidos');
  const input = body as Record<string, unknown>;
  const allowed = ['name', 'format', 'mode', 'width', 'height', 'config'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new HttpError(400, 'Campo de proyecto no permitido');
  if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 200)) throw new HttpError(400, 'El nombre debe tener entre 1 y 200 caracteres');
  if (input.format !== undefined && !['facebook', 'tiktok', 'story'].includes(String(input.format))) throw new HttpError(400, 'Formato inválido');
  if (input.mode !== undefined && !['minimal', 'optimized', 'diagonal', 'editorial', 'soft'].includes(String(input.mode))) throw new HttpError(400, 'Estilo inválido');
  for (const key of ['width', 'height']) {
    if (input[key] !== undefined && (!Number.isInteger(input[key]) || Number(input[key]) < 1 || Number(input[key]) > 4096)) throw new HttpError(400, 'Dimensiones inválidas');
  }
  if (input.config !== undefined && (!input.config || typeof input.config !== 'object' || Array.isArray(input.config))) throw new HttpError(400, 'Configuración inválida');
  if (input.format !== undefined) {
    const height = input.format === 'facebook' ? 1350 : 1920;
    if ((input.width !== undefined && input.width !== 1080) || (input.height !== undefined && input.height !== height)) throw new HttpError(400, 'Dimensiones incompatibles con la plantilla');
    input.width = 1080;
    input.height = height;
  }
  return input as { name?: string; format?: string; mode?: string; width?: number; height?: number; config?: Prisma.InputJsonObject };
}

app.get('/api/projects/:id', async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: String(req.params.id) }, include: { assets: { orderBy: { createdAt: 'asc' } } } });
  if (!project) throw new HttpError(404, 'Proyecto no encontrado');
  res.json(project);
});

app.post('/api/projects', async (req, res) => {
  const data = projectData({ format: 'tiktok', ...req.body });
  const project = await prisma.project.create({ data: { ...data, name: data.name ?? 'Nuevo flyer', config: data.config ?? {} } });
  res.status(201).json(project);
});

app.patch('/api/projects/:id', async (req, res) => {
  const data = projectData(req.body);
  const existing = await prisma.project.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw new HttpError(404, 'Proyecto no encontrado');
  if (data.format !== undefined && data.format !== existing.format) throw new HttpError(409, 'Crea un proyecto separado para otra plantilla');
  const project = await prisma.project.update({ where: { id: existing.id }, data: projectData({ ...data, format: existing.format }) });
  res.json(project);
});

app.post('/api/projects/:id/assets', async (req, _res, next) => {
  const project = await prisma.project.findUnique({ where: { id: String(req.params.id) }, select: { id: true, format: true } });
  if (!project) throw new HttpError(404, 'Proyecto no encontrado');
  _res.locals.projectFormat = project.format;
  next();
}, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo' });
  try {
  const isImage = req.file.mimetype.startsWith('image/');
  if ((res.locals.projectFormat === 'facebook' && !isImage) || (res.locals.projectFormat === 'tiktok' && isImage)) throw new HttpError(415, 'Facebook admite imagenes y TikTok admite videos');
  let metadata: { width?: number; height?: number } = {};
  if (isImage) {
    try { metadata = await sharp(req.file.path, { limitInputPixels: 40000000 }).metadata(); }
    catch { throw new HttpError(422, 'Imagen dañada o demasiado grande'); }
  }
  const asset = await prisma.asset.create({
    data: {
      projectId: String(req.params.id),
      kind: isImage ? 'image' : 'video',
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
      width: metadata.width,
      height: metadata.height
    }
  });
  res.status(201).json(asset);
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => undefined);
    throw error;
  }
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) { res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera los 100 MB' : 'Carga de archivo inválida' }); return; }
  if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2025', 'P2003'].includes(error.code)) { res.status(404).json({ error: 'Proyecto no encontrado' }); return; }
  if (error instanceof SyntaxError) { res.status(400).json({ error: 'JSON inválido' }); return; }
  console.error('API error:', error);
  res.status(500).json({ error: 'No se pudo completar la operación. Verifica la conexión del servidor.' });
});

const server = app.listen(port);

server.once('listening', () => {
  console.log(`Flayer API running on http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Flayer API failed to start:', error);
  process.exitCode = 1;
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down Flayer API...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
