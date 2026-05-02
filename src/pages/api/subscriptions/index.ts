import type { NextApiRequest, NextApiResponse } from "next";
import { MOCK_SUBSCRIPTION_PURCHASES } from "@/lib/mock-data";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { appId, status } = req.query;

  let data = MOCK_SUBSCRIPTION_PURCHASES;

  if (appId && typeof appId === "string") {
    data = data.filter((s) => s.app_id === appId);
  }

  if (status && typeof status === "string") {
    data = data.filter((s) => s.status === status);
  }

  // In production: fetch from Supabase
  // const supabase = getSupabaseClient();
  // if (supabase) {
  //   let query = supabase.from('subscription_purchases').select('*, subscriptions(*), applications(*)');
  //   if (appId) query = query.eq('app_id', appId);
  //   if (status) query = query.eq('status', status);
  //   const { data: rows, error } = await query;
  //   if (!error) return res.status(200).json({ data: rows });
  // }

  return res.status(200).json({ data, total: data.length });
}
