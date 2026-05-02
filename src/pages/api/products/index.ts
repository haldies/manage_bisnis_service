import type { NextApiRequest, NextApiResponse } from "next";
import { MOCK_ONE_TIME_PURCHASES } from "@/lib/mock-data";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { appId, status, productId } = req.query;

  let data = MOCK_ONE_TIME_PURCHASES;

  if (appId && typeof appId === "string") {
    data = data.filter((o) => o.app_id === appId);
  }
  if (status && typeof status === "string") {
    data = data.filter((o) => o.status === status);
  }
  if (productId && typeof productId === "string") {
    data = data.filter((o) => o.product_id === productId);
  }

  // In production: fetch from Supabase
  // const supabase = getSupabaseClient();
  // if (supabase) {
  //   let query = supabase.from('one_time_purchases').select('*, applications(*)');
  //   if (appId) query = query.eq('app_id', appId);
  //   if (status) query = query.eq('status', status);
  //   if (productId) query = query.eq('product_id', productId);
  //   const { data: rows, error } = await query;
  //   if (!error) return res.status(200).json({ data: rows });
  // }

  return res.status(200).json({ data, total: data.length });
}
