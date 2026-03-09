import type { Metadata } from "next";
import "./globals.css";
import { getSessionFromCookie } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "ProofMode — AI Fact Checking in Seconds",
  description:
    "Paste any text and get a claim-by-claim verification report backed by real sources. Built for journalists, researchers, and anyone who cares about accuracy.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "ProofMode — AI Fact Checking in Seconds",
    description:
      "Paste any text and get a claim-by-claim verification report backed by real sources.",
    siteName: "ProofMode",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ProofMode — AI Fact Checking in Seconds",
    description:
      "Paste any text and get a claim-by-claim verification report backed by real sources.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navUser = await getSessionFromCookie();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-surface-950 text-slate-100">
        <Nav
          user={
            navUser
              ? {
                  plan: navUser.plan,
                  planStatus: navUser.planStatus,
                  role: navUser.role,
                }
              : null
          }
        />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
