import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.query;

    const where: any = {};
    if (email && typeof email === "string") {
      where.email = email;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({ data: users, total: users.length });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching staff" });
  }
}

