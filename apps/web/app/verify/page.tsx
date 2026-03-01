import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VerifyClient } from "./verify-client";
import { pool } from "@/lib/db";

// P4: Pass plan+planStatus to VerifyClient for plan-aware usage messaging.

async function getSessionUser() {
    const cookieStore = cookies();
    const token = cookieStore.get("pm_session")?.value;
    if (!token) return null;
    const result = await pool.query<{ user_id: string; plan: string; plan_status: string }>(
      `SELECT s.user_id, u.plan, u.plan_status
           FROM sessions s JOIN users u ON u.id = s.user_id
                WHERE s.token = $1 AND s.expires_at > NOW()`,
          [token]
        );
    return result.rows[0] ?? null;
}

export default async function VerifyPage() {
    const user = await getSessionUser();
    if (!user) {
      redirect("/login");
    }
    return <VerifyClient plan={user.plan} planStatus={user.plan_status} />;
}
