import type { MetadataRoute } from "next";
import { pool } from "@/lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://factward.ai";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/verify`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/trust`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/tools`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Include recent public reports (last 500 completed)
  let reportPages: MetadataRoute.Sitemap = [];
  try {
    const { rows } = await pool.query<{ id: string; created_at: Date }>(
      `SELECT p.id, p.created_at
       FROM packs p
       JOIN jobs j ON j.id = p.job_id
       WHERE j.status = 'complete'
       ORDER BY p.created_at DESC
       LIMIT 500`
    );
    reportPages = rows.map((row) => ({
      url: `${BASE_URL}/report/${row.id}`,
      lastModified: row.created_at,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  } catch {
    // Database unavailable during build — return static pages only
  }

  return [...staticPages, ...reportPages];
}
