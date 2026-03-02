import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import AdminReportPage from "./admin-client";

export default async function AdminPage() {
    const user = await getSessionFromCookie();
    if (!user || user.role !== "admin") {
        redirect("/verify");
    }
    return <AdminReportPage />;
}
