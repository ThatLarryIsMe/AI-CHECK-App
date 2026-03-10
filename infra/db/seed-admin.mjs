#!/usr/bin/env node
/**
 * Seed (or reset) the Factward admin user.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=<secret> node infra/db/seed-admin.mjs
 *
 * Required env vars:
 *   DATABASE_URL   — Postgres connection string
 *   ADMIN_EMAIL    — Email address for the admin user
 *   ADMIN_PASSWORD — Password for the admin user (min 8 chars)
 */

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import pg from "pg";

const scryptAsync = promisify(scrypt);

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  process.exit(1);
}
if (PASSWORD.length < 8) {
  console.error("ERROR: ADMIN_PASSWORD must be at least 8 characters");
  process.exit(1);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: dbUrl });

  try {
    const hash = await hashPassword(PASSWORD);

    await pool.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES (gen_random_uuid(), $1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET
         role = 'admin',
         password_hash = $2`,
      [EMAIL, hash]
    );

    console.log(`Admin user seeded successfully.`);
    console.log(`  Email: ${EMAIL}`);
    // Password intentionally not logged
  } catch (err) {
    console.error("Failed to seed admin user:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
