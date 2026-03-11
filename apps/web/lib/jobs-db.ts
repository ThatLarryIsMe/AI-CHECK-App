import { pool } from "@/lib/db";
import type { EvidencePack } from "@factward/core";

export type JobStatus = "queued" | "processing" | "complete" | "failed";

export interface JobRecord {
  id: string;
  status: JobStatus;
  inputText: string | null;
  packId: string | null;
  userId: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export async function createJob(inputText: string, userId?: string): Promise<JobRecord> {
  const id = crypto.randomUUID();
  const { rows } = await pool.query<JobRecord>(
    `INSERT INTO jobs (id, user_id, status, input_text)
      VALUES ($1, $3, 'queued', $2)
      RETURNING id, status, input_text AS "inputText",
                pack_id AS "packId", user_id AS "userId", error,
                created_at AS "createdAt",
                updated_at AS "updatedAt",
                completed_at AS "completedAt"`,
    [id, inputText, userId ?? null]
  );
  return rows[0];
}

export async function markProcessing(jobId: string): Promise<void> {
  await pool.query(
    `UPDATE jobs SET status = 'processing', updated_at = NOW() WHERE id = $1`,
    [jobId]
  );
}

export async function markComplete(
  jobId: string,
  packId: string
): Promise<void> {
  await pool.query(
    `UPDATE jobs SET status = 'complete', pack_id = $2, updated_at = NOW(), completed_at = NOW() WHERE id = $1`,
    [jobId, packId]
  );
}

export async function markFailed(
  jobId: string,
  error: string
): Promise<void> {
  await pool.query(
    `UPDATE jobs SET status = 'failed', error = $2, updated_at = NOW(), completed_at = NOW() WHERE id = $1`,
    [jobId, error]
  );
}

export async function insertJobMetrics(params: {
  jobId: string;
  durationMs: number;
  llmTimeout: boolean;
  retrievalUsed: boolean;
}): Promise<void> {
  const { jobId, durationMs, llmTimeout, retrievalUsed } = params;
  await pool.query(
    `INSERT INTO job_metrics (job_id, duration_ms, llm_timeout, retrieval_used)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (job_id) DO NOTHING`,
    [jobId, durationMs, llmTimeout, retrievalUsed]
  );
}

export async function savePack(
  jobId: string,
  engineVersion: string,
  pack: EvidencePack
): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO packs (id, job_id, engine_version, pack_json) VALUES ($1, $2, $3, $4::jsonb)`,
    [id, jobId, engineVersion, JSON.stringify(pack)]
  );
  return id;
}

export async function getJob(jobId: string): Promise<JobRecord | null> {
  const { rows } = await pool.query<JobRecord>(
    `SELECT id, status, input_text AS "inputText",
            pack_id AS "packId", user_id AS "userId", error,
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            completed_at AS "completedAt"
     FROM jobs WHERE id = $1`,
    [jobId]
  );
  return rows[0] ?? null;
}

export async function getPack(
  packId: string
): Promise<EvidencePack | null> {
  const { rows } = await pool.query<{ pack_json: EvidencePack }>(
    `SELECT pack_json FROM packs WHERE id = $1`,
    [packId]
  );
  return rows[0]?.pack_json ?? null;
}

// P2.2: ownership-aware pack fetch — returns null when pack/job not found or userId mismatch
export async function getPackForUser(
  packId: string,
  userId: string
): Promise<EvidencePack | null> {
  const { rows } = await pool.query<{ pack_json: EvidencePack }>(
    `SELECT p.pack_json
     FROM packs p
     JOIN jobs j ON j.id = p.job_id
     WHERE p.id = $1 AND j.user_id = $2`,
    [packId, userId]
  );
  return rows[0]?.pack_json ?? null;
}
