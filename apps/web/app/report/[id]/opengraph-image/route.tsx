import { ImageResponse } from "next/og";
import { getPack } from "@/lib/jobs-db";

export const runtime = "nodejs";

function verdictColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 65) return "#84cc16";
  if (score >= 50) return "#eab308";
  if (score >= 35) return "#f97316";
  if (score >= 20) return "#ef4444";
  return "#dc2626";
}

function verdictLabel(score: number): string {
  if (score >= 80) return "Verified";
  if (score >= 65) return "Well Supported";
  if (score >= 50) return "Mostly Supported";
  if (score >= 35) return "Mixed Evidence";
  if (score >= 20) return "Poorly Supported";
  return "Refuted";
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const pack = await getPack(params.id);

  if (!pack) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#0f172a",
            color: "#94a3b8",
            fontSize: 32,
          }}
        >
          Report not found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const claims = pack.claims ?? [];
  const total = claims.length;
  const supported = claims.filter((c: { status: string }) => c.status === "supported").length;
  const unsupported = claims.filter((c: { status: string }) => c.status === "unsupported").length;
  const overarchingScore =
    typeof (pack as { overarchingScore?: number }).overarchingScore === "number"
      ? (pack as { overarchingScore: number }).overarchingScore
      : 0;
  const overarchingClaim = (pack as { overarchingClaim?: string }).overarchingClaim;

  const color = verdictColor(overarchingScore);
  const label = verdictLabel(overarchingScore);
  const claimText = overarchingClaim
    ? overarchingClaim.length > 100
      ? overarchingClaim.slice(0, 97) + "..."
      : overarchingClaim
    : `${total} claims analyzed`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0f172a",
          padding: "60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#22d3ee" strokeWidth="1.5" />
            <path
              d="M5 8l2 2 4-4"
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              color: "#22d3ee",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            FACTWARD VERIFICATION REPORT
          </span>
        </div>

        {/* Claim text */}
        <div
          style={{
            display: "flex",
            fontSize: 36,
            fontWeight: 600,
            color: "#e2e8f0",
            lineHeight: 1.3,
            marginBottom: "40px",
            maxHeight: "140px",
            overflow: "hidden",
          }}
        >
          &ldquo;{claimText}&rdquo;
        </div>

        {/* Score section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "40px",
            marginTop: "auto",
          }}
        >
          {/* Score circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "120px",
                height: "120px",
                borderRadius: "60px",
                border: `6px solid ${color}`,
                backgroundColor: `${color}15`,
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: color,
                }}
              >
                {overarchingScore}
              </span>
            </div>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: color,
                marginTop: "8px",
              }}
            >
              {label}
            </span>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "32px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: "#e2e8f0" }}>{total}</span>
              <span style={{ fontSize: 16, color: "#94a3b8" }}>Claims</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: "#22c55e" }}>{supported}</span>
              <span style={{ fontSize: 16, color: "#94a3b8" }}>Supported</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: "#ef4444" }}>{unsupported}</span>
              <span style={{ fontSize: 16, color: "#94a3b8" }}>Refuted</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
