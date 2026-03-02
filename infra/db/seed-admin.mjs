#!/usr/bin/env node
/**
 * Seed (or reset) the ProofMode admin user.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node infra/db/seed-admin.mjs
 *
 * Or if DATABASE_URL is already in the environment:
 *   node infra/db/seed-admin.mjs
 *
 * Default credentials:
 *   Email:    admin@proofmode.ai
 *   Password: ProofAdmin2024!
 */

import { createHash, scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import pg from "pg";

const scryptAsync = promisify(scrypt);

const EMAIL = process.env.ADMIN_EMAIL || "admin@proofmode.ai";
const PASSWORD = process.env.ADMIN_PASSWORD || "ProofAdmin2024!";

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
    console.log(`  Email:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
  } catch (err) {
    console.error("Failed to seed admin user:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
