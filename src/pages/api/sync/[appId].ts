import type { NextApiRequest, NextApiResponse } from "next";
import { MOCK_APPLICATIONS } from "@/lib/mock-data";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { appId } = req.query;

  if (!appId || typeof appId !== "string") {
    return res.status(400).json({ error: "appId is required" });
  }

  const app = MOCK_APPLICATIONS.find((a) => a.id === appId);
  if (!app) {
    return res.status(404).json({ error: "Application not found" });
  }

  // In production:
  // 1. Load service account JSON from Supabase for this app
  // 2. Authenticate with Google Play API
  // 3. Fetch subscription purchases:
  //    GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptionsv2
  // 4. Fetch in-app product purchases
  // 5. Upsert all records into Supabase
  // 6. Update app.last_sync timestamp

  // Simulate sync delay
  await new Promise((r) => setTimeout(r, 500));

  return res.status(200).json({
    data: {
      app_id: appId,
      synced_subscriptions: Math.floor(Math.random() * 20) + 5,
      synced_purchases: Math.floor(Math.random() * 10) + 2,
      errors: [],
      synced_at: new Date().toISOString(),
    },
    message: `Sync completed for ${app.name}`,
  });
}
