import { z } from "zod";
export {
  ClaimSchema,
  EvidenceSchema,
  EvidencePackSchema,
  type Claim,
  type Evidence,
  type EvidencePack
} from "./schema";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime()
});

export const JobSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  createdAt: z.string().datetime()
});

export type User = z.infer<typeof UserSchema>;
export type Job = z.infer<typeof JobSchema>;
