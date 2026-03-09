import { redirect } from "next/navigation";
import { VerifyClient } from "./verify-client";
import { getSessionFromCookie } from "@/lib/auth";

export default async function VerifyPage() {
    const user = await getSessionFromCookie();
    if (!user) {
      redirect("/login");
    }
    return <VerifyClient plan={user.plan} planStatus={user.planStatus} role={user.role} />;
}
