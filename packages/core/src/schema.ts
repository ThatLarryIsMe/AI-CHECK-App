import { z } from "zod";

export const ClaimSchema = z.object({
    id: z.string().uuid(),
    packId: z.string().uuid(),
    text: z.string(),
    status: z.enum(["supported", "mixed", "unsupported", "insufficient"]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().optional(),
    // New fields for granular scoring system
    verdictScore: z.number().min(0).max(100).optional(),
    subClaimRationale: z.string().optional(),
    evidenceBreakdown: z.object({
        supporting: z.number().min(0),
        contradicting: z.number().min(0),
        neutral: z.number().min(0),
    }).optional(),
});

export const EvidenceSchema = z.object({
    id: z.string().uuid(),
    claimId: z.string().uuid(),
    sourceUrl: z.string().url(),
    snippet: z.string(),
    relevanceScore: z.number(),
    sourceTitle: z.string().optional(),
    quotedSpan: z.string().optional(),
    retrievedAt: z.string().optional(),
    // New: stance of this evidence relative to the claim
    stance: z.enum(["supporting", "contradicting", "neutral"]).optional(),
});

export const EvidencePackSchema = z.object({
    id: z.string().uuid(),
    jobId: z.string().uuid(),
    claims: z.array(ClaimSchema),
    evidence: z.array(EvidenceSchema),
    createdAt: z.string().datetime(),
    engineVersion: z.string(),
    // New: overarching claim/thesis identified from the input
    overarchingClaim: z.string().optional(),
    overarchingScore: z.number().min(0).max(100).optional(),
    overarchingVerdict: z.string().optional(),
});

export type Claim = z.infer<typeof ClaimSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type EvidencePack = z.infer<typeof EvidencePackSchema>;
