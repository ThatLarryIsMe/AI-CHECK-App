import { VerifyClient } from "./verify-client";
import { getSessionFromCookie } from "@/lib/auth";

export default async function VerifyPage() {
    const user = await getSessionFromCookie();
    return (
      <VerifyClient
        plan={user?.plan ?? "free"}
        planStatus={user?.planStatus ?? "inactive"}
        role={user?.role ?? "user"}
        isAnonymous={!user}
      />
    );
}
