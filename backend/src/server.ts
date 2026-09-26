import 'dotenv/config';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { Prisma, PrismaClient } from '@prisma/client';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { z } from 'zod';

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 4000);
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
const redisUrl = process.env.REDIS_URL;
const redisRequired = process.env.REDIS_REQUIRED === 'true';
const projectLockMs = Number(process.env.PROJECT_LOCK_MS ?? 300000);
await fs.mkdir(uploadDir, { recursive: true });

function cleanUrl(value: string | undefined) {
  return value?.trim().replace(/\/$/, '') ?? '';
}

function csv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

const appBaseUrl = cleanUrl(process.env.APP_BASE_URL) || `http://localhost:${port}`;
const frontendBaseUrl = cleanUrl(process.env.FRONTEND_BASE_URL);

let redis: Redis | null = null;
if (redisUrl) {
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });

  client.on('error', error => {
    console.error('Redis error:', error.message);
  });

  try {
    await client.connect();
    redis = client;
    console.log('Redis connected');
  } catch (error) {
    if (redisRequired) throw error;
    console.warn('Redis unavailable; using in-memory rate limits and project locks are disabled.');
    client.disconnect();
    redis = null;
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const acceptedMime = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm'
} as const;

const maxUploadBytes = 100 * 1024 * 1024;

const formats = ['facebook', 'tiktok', 'story'] as const;
const modes = ['minimal', 'optimized', 'diagonal', 'editorial', 'soft'] as const;

const projectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  format: z.enum(formats).optional(),
  mode: z.enum(modes).optional(),
  width: z.number().int().min(1).max(4096).optional(),
  height: z.number().int().min(1).max(4096).optional(),
  config: z.record(z.string(), z.unknown()).optional()
}).strict();

const corsOrigins = csv(frontendBaseUrl);

function isRedisReady() {
  return redis?.status === 'ready';
}

function originMatchesPattern(origin: string, pattern: string) {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return origin === pattern;

  const escaped = pattern
    .split('*')
    .map(part => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
    .join('.*');

  return new RegExp(`^${escaped}$`).test(origin);
}

function corsOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin || corsOrigins.some(pattern => originMatchesPattern(origin, pattern))) {
    callback(null, true);
    return;
  }

  callback(new HttpError(403, 'Origen no permitido por CORS'));
}

async function withProjectLock<T>(projectId: string, action: () => Promise<T>) {
  if (!redis || !isRedisReady()) return action();

  const key = `flayer:project-lock:${projectId}`;
  const token = randomUUID();
  const acquired = await redis.set(key, token, 'PX', projectLockMs, 'NX');

  if (acquired !== 'OK') {
    throw new HttpError(409, 'Este proyecto se esta guardando en otra sesion. Intenta nuevamente en unos segundos.');
  }

  try {
    return await action();
  } finally {
    await redis.eval(
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
      1,
      key,
      token
    ).catch(() => undefined);
  }
}

function uploadPathFromUrl(url: string) {
  const filename = path.basename(url);
  if (!filename || filename === '.' || filename === '..') return null;
  return path.join(uploadDir, filename);
}

async function deleteUploadedAssetFile(url: string) {
  const filePath = uploadPathFromUrl(url);
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => undefined);
}

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ...(redis && isRedisReady()
    ? {
        store: new RedisStore({
          prefix: 'flayer:rate-limit:',
          sendCommand: (command: string, ...args: string[]) => redis!.call(command, ...args) as Promise<RedisReply>
        })
      }
    : {})
}));
app.use(cors({ origin: corsOrigins.includes('*') ? true : corsOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const extension = acceptedMime[file.mimetype as keyof typeof acceptedMime] ?? '.bin';
      callback(null, `${randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: maxUploadBytes },
  fileFilter: (_req, file, callback) => {
    if (!(file.mimetype in acceptedMime)) {
      callback(new HttpError(415, 'Usa JPG, PNG, WebP, MP4 o WebM'));
      return;
    }

    callback(null, true);
  }
});

function projectData(body: unknown) {
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos de proyecto invalidos';
    throw new HttpError(400, message);
  }

  const input = parsed.data;

  if (input.format !== undefined) {
    const height = input.format === 'facebook' ? 1350 : 1920;
    if ((input.width !== undefined && input.width !== 1080) || (input.height !== undefined && input.height !== height)) {
      throw new HttpError(400, 'Dimensiones incompatibles con la plantilla');
    }

    input.width = 1080;
    input.height = height;
  }

  return input as {
    name?: string;
    format?: string;
    mode?: string;
    width?: number;
    height?: number;
    config?: Prisma.InputJsonObject;
  };
}

app.get('/api/health', async (_req, res) => {
  const database = await prisma.$queryRaw`SELECT 1`
    .then(() => 'ok')
    .catch(() => 'error');
  const cache = redis ? (isRedisReady() ? 'ok' : 'error') : 'disabled';

  res.status(database === 'ok' && cache !== 'error' ? 200 : 503).json({
    ok: database === 'ok' && cache !== 'error',
    services: { database, redis: cache },
    baseUrl: appBaseUrl
  });
});

app.get('/api/projects', async (_req, res) => {
  const projects = await prisma.project.findMany({
    include: { assets: true },
    orderBy: { updatedAt: 'desc' }
  });

  res.json(projects);
});

app.get('/api/projects/:id', async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: String(req.params.id) },
    include: { assets: { orderBy: { createdAt: 'asc' } } }
  });

  if (!project) throw new HttpError(404, 'Proyecto no encontrado');
  res.json(project);
});

app.post('/api/projects', async (req, res) => {
  const data = projectData({ format: 'tiktok', ...req.body });
  const project = await prisma.project.create({
    data: {
      ...data,
      name: data.name ?? 'Nuevo flyer',
      config: data.config ?? {}
    }
  });

  res.status(201).json(project);
});

app.patch('/api/projects/:id', async (req, res) => {
  const data = projectData(req.body);
  const existing = await prisma.project.findUnique({ where: { id: String(req.params.id) } });

  if (!existing) throw new HttpError(404, 'Proyecto no encontrado');
  if (data.format !== undefined && data.format !== existing.format) {
    throw new HttpError(409, 'Crea un proyecto separado para otra plantilla');
  }

  const project = await withProjectLock(existing.id, () => {
    return prisma.project.update({
      where: { id: existing.id },
      data: projectData({ ...data, format: existing.format })
    });
  });

  res.json(project);
});

app.post('/api/projects/:id/assets', async (req, res, next) => {
  const project = await prisma.project.findUnique({
    where: { id: String(req.params.id) },
    select: { id: true, format: true }
  });

  if (!project) throw new HttpError(404, 'Proyecto no encontrado');
  res.locals.projectFormat = project.format;
  next();
}, upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Falta el archivo' });
    return;
  }
  const uploadedFile = req.file;

  try {
    const isImage = uploadedFile.mimetype.startsWith('image/');
    const projectFormat = String(res.locals.projectFormat);

    if ((projectFormat === 'facebook' && !isImage) || (projectFormat === 'tiktok' && isImage)) {
      throw new HttpError(415, 'Facebook admite imagenes y TikTok admite videos');
    }

    let metadata: { width?: number; height?: number } = {};
    if (isImage) {
      try {
        metadata = await sharp(uploadedFile.path, { limitInputPixels: 40000000 }).metadata();
      } catch {
        throw new HttpError(422, 'Imagen danada o demasiado grande');
      }
    }

    const projectId = String(req.params.id);
    const kind = isImage ? 'image' : 'video';
    const previousAssets: { url: string }[] = [];

    const asset = await withProjectLock(projectId, async () => {
      const existing = await prisma.asset.findMany({
        where: { projectId, kind },
        select: { id: true, url: true }
      });

      const created = await prisma.$transaction(async tx => {
        const newAsset = await tx.asset.create({
          data: {
            projectId,
            kind,
            filename: uploadedFile.originalname,
            mimeType: uploadedFile.mimetype,
            url: `/uploads/${uploadedFile.filename}`,
            width: metadata.width,
            height: metadata.height
          }
        });

        if (existing.length) {
          await tx.asset.deleteMany({ where: { id: { in: existing.map(asset => asset.id) } } });
        }

        return newAsset;
      });

      previousAssets.push(...existing.map(asset => ({ url: asset.url })));
      return created;
    });

    await Promise.all(previousAssets.map(asset => deleteUploadedAssetFile(asset.url)));
    res.status(201).json(asset);
  } catch (error) {
    await fs.unlink(uploadedFile.path).catch(() => undefined);
    throw error;
  }
});

app.delete('/api/projects/:projectId/assets/:assetId', async (req, res) => {
  const projectId = String(req.params.projectId);
  const assetId = String(req.params.assetId);

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, projectId },
    select: { id: true, url: true }
  });

  if (!asset) throw new HttpError(404, 'Archivo no encontrado');

  await withProjectLock(projectId, async () => {
    await prisma.asset.delete({ where: { id: asset.id } });
  });
  await deleteUploadedAssetFile(asset.url);

  res.json({ ok: true });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      error: error.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera los 100 MB' : 'Carga de archivo invalida'
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2025', 'P2003'].includes(error.code)) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({ error: 'JSON invalido' });
    return;
  }

  console.error('API error:', error);
  res.status(500).json({ error: 'No se pudo completar la operacion. Verifica la conexion del servidor.' });
});

const server = app.listen(port);

server.once('listening', () => {
  console.log(`Flayer API running on ${appBaseUrl}`);
});

server.on('error', (error) => {
  console.error('Flayer API failed to start:', error);
  process.exitCode = 1;
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down Flayer API...`);
  server.close(async () => {
    if (redis) redis.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
