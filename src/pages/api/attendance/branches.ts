import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const branches = await prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          latitude: true,
          longitude: true,
          radiusMeters: true,
        }
      });
      return res.status(200).json({ data: branches });
    } catch (error: any) {
      console.error("Fetch branches error:", error);
      return res.status(500).json({ message: "Error fetching branches", error: error.message });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
