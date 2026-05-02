/**
 * routes.js — Endpoints REST + autenticación por PIN
 * ────────────────────────────────────────────────────
 * GET    /api/auth          → valida PIN y devuelve nombre de usuario
 * GET    /api/damages       → lista todos los daños (con fotos)
 * POST   /api/damages       → crea un daño (multipart: texto + fotos)
 * DELETE /api/damages/:id   → elimina un daño propio
 *
 * Auth: header `X-PIN` se compara contra los PINs del .env.
 * Si el PIN no es válido, 401. La identidad del usuario se inyecta
 * en `request.user` para todos los handlers.
 */

import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pool } from './db.js';

/* ════════════════════════════════════════════════════════
   USUARIOS — leídos del .env al arrancar
═══════════════════════════════════════════════════════ */

function loadUsers() {
  const users = [];
  for (let i = 1; i <= 10; i++) {
    const name = process.env[`USER_${i}_NAME`];
    const pin  = process.env[`USER_${i}_PIN`];
    if (name && pin) users.push({ name, pin });
  }
  if (!users.length) {
    throw new Error('No hay usuarios configurados. Defina USER_1_NAME / USER_1_PIN en .env');
  }
  return users;
}

const USERS = loadUsers();

function findUserByPin(pin) {
  return USERS.find(u => u.pin === pin) || null;
}


/* ════════════════════════════════════════════════════════
   PLUGIN — registra todas las rutas
═══════════════════════════════════════════════════════ */

export default async function routes(app, opts) {
  const { uploadsDir, uploadsUrl } = opts;

  /* ── Hook de auth para /api/damages/* ────────────── */
  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/api/damages')) return;
    const pin = req.headers['x-pin'];
    const user = pin ? findUserByPin(String(pin)) : null;
    if (!user) {
      reply.code(401).send({ error: 'PIN inválido' });
      return reply;
    }
    req.user = user;
  });

  /* ── POST /api/auth — login ──────────────────────── */
  app.post('/api/auth', async (req, reply) => {
    const { pin } = req.body || {};
    const user = pin ? findUserByPin(String(pin)) : null;
    if (!user) return reply.code(401).send({ error: 'PIN inválido' });
    return { name: user.name };
  });

  /* ── GET /api/damages — lista todo ───────────────── */
  app.get('/api/damages', async () => {
    const [damages] = await pool.query(
      `SELECT id, area, subarea, title, description, severity,
              videos, date, created_by, created_at
         FROM damages
         ORDER BY created_at DESC`
    );
    if (!damages.length) return [];

    const ids = damages.map(d => d.id);
    const [photos] = await pool.query(
      `SELECT damage_id, url FROM damage_photos WHERE damage_id IN (?)`,
      [ids]
    );

    const photosByDamage = {};
    for (const p of photos) {
      (photosByDamage[p.damage_id] ||= []).push(p.url);
    }

    return damages.map(d => ({
      id:         d.id,
      area:       d.area,
      subarea:    d.subarea,
      title:      d.title,
      desc:       d.description,
      severity:   d.severity,
      videos:     d.videos || [],
      date:       d.date,
      created_by: d.created_by,
      created_at: d.created_at,
      photos:     photosByDamage[d.id] || [],
    }));
  });

  /* ── POST /api/damages — crea daño + fotos ───────── */
  app.post('/api/damages', async (req, reply) => {
    const fields = {};
    const photoUrls = [];

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        const ext = path.extname(part.filename || '').toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif'].includes(ext)
          ? ext : '.jpg';
        const filename = `${randomUUID()}${safeExt}`;
        const dest = path.join(uploadsDir, filename);
        await pipeline(part.file, createWriteStream(dest));
        photoUrls.push(`${uploadsUrl}/${filename}`);
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    const area     = (fields.area     || '').trim();
    const subarea  = (fields.subarea  || '').trim() || null;
    const title    = (fields.title    || '').trim();
    const desc     = (fields.desc     || '').trim() || null;
    const severity = (fields.severity || '').trim();
    const videos   = parseJsonArray(fields.videos);

    if (!area || !title || !['leve','moderado','grave'].includes(severity)) {
      // limpiar archivos huérfanos
      await Promise.all(photoUrls.map(u => unlink(path.join(uploadsDir, path.basename(u))).catch(() => {})));
      return reply.code(400).send({ error: 'Campos obligatorios incompletos' });
    }

    const id = Date.now();
    const date = new Date().toLocaleDateString('es-AR');

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO damages
           (id, area, subarea, title, description, severity, videos, date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, area, subarea, title, desc, severity, JSON.stringify(videos), date, req.user.name]
      );

      for (const url of photoUrls) {
        await conn.execute(
          `INSERT INTO damage_photos (damage_id, url) VALUES (?, ?)`,
          [id, url]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      await Promise.all(photoUrls.map(u => unlink(path.join(uploadsDir, path.basename(u))).catch(() => {})));
      throw err;
    } finally {
      conn.release();
    }

    return reply.code(201).send({
      id, area, subarea, title, desc, severity,
      videos, date, photos: photoUrls,
      created_by: req.user.name,
    });
  });

  /* ── DELETE /api/damages/:id — solo el autor ─────── */
  app.delete('/api/damages/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ error: 'ID inválido' });
    }

    const [rows] = await pool.query(
      `SELECT created_by FROM damages WHERE id = ?`, [id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'No existe' });
    if (rows[0].created_by !== req.user.name) {
      return reply.code(403).send({ error: 'Solo podés eliminar los daños que vos cargaste' });
    }

    const [photos] = await pool.query(
      `SELECT url FROM damage_photos WHERE damage_id = ?`, [id]
    );

    await pool.execute(`DELETE FROM damages WHERE id = ?`, [id]);

    // borrar archivos físicos (best-effort)
    await Promise.all(photos.map(p =>
      unlink(path.join(uploadsDir, path.basename(p.url))).catch(() => {})
    ));

    return { ok: true };
  });
}


/* ════════════════════════════════════════════════════════
   Utilidades
═══════════════════════════════════════════════════════ */

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string' && v.trim()) : [];
  } catch {
    return [];
  }
}
