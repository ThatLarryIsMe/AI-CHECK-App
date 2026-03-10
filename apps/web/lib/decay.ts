/**
 * Verification Decay Engine
 *
 * Claims have a shelf life. A statistic verified today is stale next month.
 * This module computes freshness scores based on claim category and age,
 * and identifies packs that need re-verification.
 */

// Claim categories and their half-life in days.
// After one half-life, confidence drops to 50% of original.
const CATEGORY_HALF_LIFE: Record<string, number> = {
  statistic: 14,       // statistics go stale fast
  economic: 21,        // economic indicators shift quarterly
  political: 30,       // political claims have moderate shelf life
  scientific: 180,     // scientific consensus is durable
  historical: 730,     // historical facts are very stable
  general: 60,         // default for unclassified claims
};

export type ClaimCategory = keyof typeof CATEGORY_HALF_LIFE;

export const CLAIM_CATEGORIES = Object.keys(CATEGORY_HALF_LIFE) as ClaimCategory[];

/**
 * Classify a claim into a decay category based on keyword heuristics.
 * Fast — no LLM call needed.
 */
export function categorizeClaimForDecay(claimText: string): ClaimCategory {
  const lower = claimText.toLowerCase();

  // Statistics: numbers, percentages, data points
  if (/\d+%|\d+\.\d+|million|billion|trillion|rate of|per capita|average|median/.test(lower)) {
    return "statistic";
  }

  // Economic: GDP, inflation, unemployment, markets
  if (/gdp|inflation|unemployment|interest rate|stock|market|economy|trade|deficit|surplus|revenue|earnings/.test(lower)) {
    return "economic";
  }

  // Political: elections, policy, legislation
  if (/president|congress|senate|parliament|election|vote|legislation|policy|democrat|republican|party|minister|government/.test(lower)) {
    return "political";
  }

  // Scientific: studies, research, biology, physics, medicine
  if (/study|research|scientist|clinical|trial|vaccine|gene|species|temperature|climate|peer.?review|published/.test(lower)) {
    return "scientific";
  }

  // Historical: wars, centuries, founded, established
  if (/founded|established|century|ancient|war|historic|first|invented|discovered in \d{3,4}/.test(lower)) {
    return "historical";
  }

  return "general";
}

/**
 * Compute a freshness score (0-100) based on exponential decay.
 *
 * freshness = 100 * (0.5 ^ (age_days / half_life))
 *
 * Returns 100 when just verified, ~50 at half-life, approaches 0 over time.
 */
export function computeFreshness(
  verifiedAt: Date | string,
  category: ClaimCategory,
  now?: Date
): number {
  const verified = typeof verifiedAt === "string" ? new Date(verifiedAt) : verifiedAt;
  const current = now ?? new Date();
  const ageDays = (current.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= 0) return 100;

  const halfLife = CATEGORY_HALF_LIFE[category] ?? CATEGORY_HALF_LIFE.general;
  const freshness = 100 * Math.pow(0.5, ageDays / halfLife);

  return Math.round(Math.max(0, Math.min(100, freshness)));
}

/**
 * Get a human-readable freshness label and color.
 */
export function freshnessLabel(score: number): {
  label: string;
  color: string;
  textColor: string;
  urgent: boolean;
} {
  if (score >= 80) return { label: "Fresh", color: "bg-green-500/20", textColor: "text-green-400", urgent: false };
  if (score >= 50) return { label: "Aging", color: "bg-yellow-500/20", textColor: "text-yellow-400", urgent: false };
  if (score >= 25) return { label: "Stale", color: "bg-orange-500/20", textColor: "text-orange-400", urgent: true };
  return { label: "Expired", color: "bg-red-500/20", textColor: "text-red-400", urgent: true };
}

/**
 * Compute the date when a verification will cross a freshness threshold.
 */
export function decayDate(
  verifiedAt: Date | string,
  category: ClaimCategory,
  threshold: number = 50
): Date {
  const verified = typeof verifiedAt === "string" ? new Date(verifiedAt) : verifiedAt;
  const halfLife = CATEGORY_HALF_LIFE[category] ?? CATEGORY_HALF_LIFE.general;

  // Solve: threshold = 100 * 0.5^(days/halfLife)
  // days = halfLife * log2(100/threshold)
  const days = halfLife * Math.log2(100 / threshold);

  const date = new Date(verified);
  date.setDate(date.getDate() + Math.ceil(days));
  return date;
}

export interface ClaimDecayInfo {
  claimText: string;
  category: ClaimCategory;
  freshness: number;
  label: string;
  color: string;
  textColor: string;
  urgent: boolean;
  staleDate: Date;   // when freshness drops below 50
  expiredDate: Date;  // when freshness drops below 25
}

/**
 * Analyze all claims in a pack for decay.
 */
export function analyzePackDecay(
  claims: Array<{ text: string }>,
  verifiedAt: Date | string,
  now?: Date
): {
  claims: ClaimDecayInfo[];
  packFreshness: number;
  staleClaims: number;
  expiredClaims: number;
} {
  const claimInfos = claims.map((claim) => {
    const category = categorizeClaimForDecay(claim.text);
    const freshness = computeFreshness(verifiedAt, category, now);
    const { label, color, textColor, urgent } = freshnessLabel(freshness);
    const staleDate = decayDate(verifiedAt, category, 50);
    const expiredDate = decayDate(verifiedAt, category, 25);

    return {
      claimText: claim.text,
      category,
      freshness,
      label,
      color,
      textColor,
      urgent,
      staleDate,
      expiredDate,
    };
  });

  const packFreshness = claimInfos.length > 0
    ? Math.round(claimInfos.reduce((sum, c) => sum + c.freshness, 0) / claimInfos.length)
    : 100;

  const staleClaims = claimInfos.filter((c) => c.freshness < 50).length;
  const expiredClaims = claimInfos.filter((c) => c.freshness < 25).length;

  return { claims: claimInfos, packFreshness, staleClaims, expiredClaims };
}
