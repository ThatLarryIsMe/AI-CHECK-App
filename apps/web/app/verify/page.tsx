import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VerifyClient } from "./verify-client";
import { pool } from "@/lib/db";

// P2.2: Server-side session gate — redirect to /login if no valid session.
// betaKey/x-proofmode-key removed from end-user flow entirely.
async function getSessionUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("pm_session")?.value;
  if (!token) return null;
  const result = await pool.query<{ user_id: string }>(
    `SELECT s.user_id FROM sessions s WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  return result.rows[0]?.user_id ?? null;
}

export default async function VerifyPage() {
  const userId = await getSessionUser();
  if (!userId) {
    redirect("/login");
  }
  return <VerifyClient />;
}
