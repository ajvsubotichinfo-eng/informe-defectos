/**
 * index.js — Punto de entrada del servidor Fastify
 * ────────────────────────────────────────────────
 * Sirve:
 *   /            → frontend estático (public/)
 *   /uploads/*   → fotos subidas
 *   /api/*       → endpoints JSON (ver routes.js)
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';

import routes from './routes.js';
import { pingDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;   // 8 MB por foto
const MAX_PHOTOS      = 12;                 // por daño

async function buildServer() {
  await mkdir(UPLOADS_DIR, { recursive: true });

  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
    bodyLimit: 50 * 1024 * 1024, // 50 MB total request
  });

  // Static: frontend
  await app.register(fastifyStatic, {
    root:   PUBLIC_DIR,
    prefix: '/',
  });

  // Static: fotos subidas (decorate=false porque ya hay un static)
  await app.register(fastifyStatic, {
    root:        UPLOADS_DIR,
    prefix:      '/uploads/',
    decorateReply: false,
  });

  // Multipart
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: MAX_PHOTO_BYTES,
      files:    MAX_PHOTOS,
    },
  });

  // Rutas API
  await app.register(routes, {
    uploadsDir: UPLOADS_DIR,
    uploadsUrl: '/uploads',
  });

  return app;
}

  (async () => {
    try {
      await pingDb();
      const app = await buildServer();
      await app.listen({ port: PORT, host: HOST });
      app.log.info(`Servidor escuchando en http://${HOST}:${PORT}`);
    } catch (err) {
      console.error('Fallo al arrancar:', err);
      process.exit(1);
    }
  })();
