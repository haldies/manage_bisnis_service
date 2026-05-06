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
    const { username } = req.query;

    const where: any = {};
    if (username && typeof username === "string") {
      where.username = username;
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

