import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

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
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const accepted = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (!accepted) return callback(new Error('Solo se permiten imagenes o videos'));
    callback(null, true);
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/projects', async (_req, res) => {
  const projects = await prisma.project.findMany({ include: { assets: true }, orderBy: { updatedAt: 'desc' } });
  res.json(projects);
});

app.post('/api/projects', async (req, res) => {
  const project = await prisma.project.create({
    data: {
      name: req.body.name || 'Nuevo flyer',
      format: req.body.format || 'tiktok',
      mode: req.body.mode || 'minimal',
      width: req.body.width || 1080,
      height: req.body.height || 1920,
      config: req.body.config || {}
    }
  });
  res.status(201).json(project);
});

app.patch('/api/projects/:id', async (req, res) => {
  const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
  res.json(project);
});

app.post('/api/projects/:id/assets', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo' });
  const isImage = req.file.mimetype.startsWith('image/');
  const metadata = isImage ? await sharp(req.file.path).metadata() : { width: undefined, height: undefined };
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
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: error.message });
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
