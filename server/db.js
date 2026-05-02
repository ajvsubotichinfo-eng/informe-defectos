/**
 * db.js — Pool de conexiones MySQL
 * ─────────────────────────────────────────
 * Pool reutilizable hacia la base de Hostinger.
 * Las credenciales viven en variables de entorno.
 */

import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4',
});

/** Verifica que la conexión funcione al arrancar el server */
export async function pingDb() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}
