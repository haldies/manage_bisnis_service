import type { NextApiRequest, NextApiResponse } from "next";
import { MOCK_APPLICATIONS } from "@/lib/mock-data";
import type { Application } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    // In production: fetch from Supabase
    // const supabase = getSupabaseClient();
    // if (supabase) {
    //   const { data, error } = await supabase.from('applications').select('*');
    //   if (!error) return res.status(200).json({ data });
    // }
    return res.status(200).json({ data: MOCK_APPLICATIONS });
  }

  if (req.method === "POST") {
    const { name, package_name, service_account_json } = req.body as Partial<Application>;
    if (!name || !package_name) {
      return res.status(400).json({ error: "name and package_name are required" });
    }
    const newApp: Application = {
      id: `app-${Date.now()}`,
      name,
      package_name,
      service_account_json,
      created_at: new Date().toISOString(),
      status: "pending",
    };
    // In production: insert into Supabase
    // const supabase = getSupabaseClient();
    // await supabase.from('applications').insert(newApp);
    return res.status(201).json({ data: newApp, message: "Application added" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
