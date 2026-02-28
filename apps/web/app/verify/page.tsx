import { VerifyClient } from "./verify-client";

// O1: Gate is now fully client-side via key-entry modal + sessionStorage.
// Server-side requireBetaKey check removed from this page.
// API routes remain protected by the x-proofmode-key header (unchanged).
export default function VerifyPage() {
  return <VerifyClient />;
}
