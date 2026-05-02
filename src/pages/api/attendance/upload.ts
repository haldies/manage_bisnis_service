import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

// Disable default body parser to handle raw base64
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

    // Strip the data URL prefix if present (e.g., "data:image/jpeg;base64,...")
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Create employee-specific directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "attendance", employeeId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename: type (checkin|checkout) + timestamp
    const filename = `${type || "checkin"}_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    // Return public URL (accessible via Cloudflare tunnel or local)
    const publicUrl = `/uploads/attendance/${employeeId}/${filename}`;

    return res.status(200).json({ url: publicUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to upload photo", detail: error.message });
  }
}
