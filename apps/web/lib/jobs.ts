import { EvidencePackSchema, type EvidencePack, type Job } from "@proofmode/core";

export type JobStatus = Job["status"];

type JobRecord = {
  id: string;
  status: JobStatus;
  packId?: string;
  error?: string;
};

const jobs = new Map<string, JobRecord>();
const packs = new Map<string, EvidencePack>();

export function createJob(id: string): JobRecord {
  const record: JobRecord = { id, status: "queued" };
  jobs.set(id, record);
  return record;
}

export function updateJob(id: string, update: Partial<JobRecord>): JobRecord | undefined {
  const current = jobs.get(id);
  if (!current) return undefined;
  const next = { ...current, ...update };
  jobs.set(id, next);
  return next;
}

export function getJob(id: string): JobRecord | undefined {
  return jobs.get(id);
}

export function savePack(pack: EvidencePack): EvidencePack {
  const validated = EvidencePackSchema.parse(pack);
  packs.set(validated.id, validated);
  return validated;
}

export function getPack(id: string): EvidencePack | undefined {
  const pack = packs.get(id);
  if (!pack) return undefined;
  return EvidencePackSchema.parse(pack);
}
