import type { Metadata } from "next";
import "./globals.css";
import { getSessionFromCookie } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Factward — Verify Every Claim Before You Publish",
  description:
    "The fact-checking tool for professionals who publish. Paste any text, URL, or PDF and get a source-backed verification report in seconds. Every claim checked individually against real evidence.",
  icons: { icon: "/favicon.svg" },
  verification: {
    google: "sJx5WPnh7jjrIwOK1lOW5_39CXsJ5BnOxA96eGcfIWQ",
  },
  openGraph: {
    title: "Factward — Verify Every Claim Before You Publish",
    description:
      "Source-backed fact-checking for professionals. Every claim verified individually against real evidence.",
    siteName: "Factward",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Factward — Verify Every Claim Before You Publish",
    description:
      "Source-backed fact-checking for professionals. Every claim verified individually against real evidence.",
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
                  email: navUser.email,
                  role: navUser.role,
                }
              : null
          }
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
