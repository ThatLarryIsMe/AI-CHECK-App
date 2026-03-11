-- Seed an admin user for Factward
-- Run after schema.sql.
--
-- Default admin email: admin@factward.com
-- Replace the hash below with one generated for your own password before running in production.
-- Use: node infra/db/seed-admin.mjs (reads ADMIN_EMAIL and ADMIN_PASSWORD from env)
--
-- To generate a new password hash, run:
--   node -e "const{scrypt,randomBytes}=require('crypto');const{promisify}=require('util');const s=promisify(scrypt);(async()=>{const salt=randomBytes(16).toString('hex');const key=await s('YOURPASSWORD',salt,64);console.log(salt+':'+key.toString('hex'))})()"

INSERT INTO users (id, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'admin@factward.com',
  'd3832730dc2de337a619cef6e56235ab:50ab760dd3556799ef2f12b1ff169b2f453469016a50d6134268ebff1c561e74532c7ddcfea6dfbeced14476282a3519fa72cbf947b743f3480f2778be6a5ac7',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  password_hash = 'd3832730dc2de337a619cef6e56235ab:50ab760dd3556799ef2f12b1ff169b2f453469016a50d6134268ebff1c561e74532c7ddcfea6dfbeced14476282a3519fa72cbf947b743f3480f2778be6a5ac7';
