–import { z } from "zod";

export const ClaimSchema = z.object({
  id: z.string().uuid(),
  packId: z.string().uuid(),
  text: z.string(),
  status: z.enum(["supported", "mixed", "unsupported"]),
    confidence: z.number().min(0).max(1).optional()
});

export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  claimId: z.string().uuid(),
  sourceUrl: z.string().url(),
  snippet: z.string(),
  relevanceScore: z.number()
});

export const EvidencePackSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  claims: z.array(ClaimSchema),
  evidence: z.array(EvidenceSchema),
  createdAt: z.string().datetime()
});

export type Claim = z.infer<typeof ClaimSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type EvidencePack = z.infer<typeof EvidencePackSchema>;
