import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseClient } from "@/lib/supabase";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { base64, employeeId, type } = req.body;

    if (!base64 || !employeeId) {
      return res.status(400).json({ error: "Missing base64 or employeeId" });
    }

    // Strip data URL prefix jika ada
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const supabase = getSupabaseClient();

    // ── Supabase Storage ──────────────────────────────────────
    if (supabase) {
      const filename = `attendance/${employeeId}/${type || "checkin"}_${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from("attendance-photos")
        .upload(filename, buffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) {
        console.error("[Upload] Supabase storage error:", error.message);
        // Fallback ke base64 data URL jika storage gagal
        const dataUrl = `data:image/jpeg;base64,${base64Data}`;
        return res.status(200).json({ url: dataUrl });
      }

      const { data: publicData } = supabase.storage
        .from("attendance-photos")
        .getPublicUrl(filename);

      return res.status(200).json({ url: publicData.publicUrl });
    }

    // ── Fallback: kembalikan base64 data URL ──────────────────
    // Dipakai jika Supabase belum dikonfigurasi
    console.warn("[Upload] Supabase not configured, returning base64 data URL");
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
    return res.status(200).json({ url: dataUrl });

  } catch (error: any) {
    console.error("[Upload] Error:", error);
    return res.status(500).json({ error: "Failed to upload photo", detail: error.message });
  }
}
