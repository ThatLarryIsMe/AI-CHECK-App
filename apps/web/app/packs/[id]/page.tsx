import { redirect } from "next/navigation";

/**
 * Legacy pack URL — redirect to the new public report page.
 */
export default function PackPage({ params }: { params: { id: string } }) {
  redirect(`/report/${params.id}`);
}
