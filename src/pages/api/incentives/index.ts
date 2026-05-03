import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { technicianId, month } = req.query; // month format: YYYY-MM

  try {
    // Jika ada technicianId, hitung insentif untuk teknisi tertentu
    if (technicianId && typeof technicianId === "string") {
      const user = await prisma.user.findUnique({ where: { id: technicianId } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Ambil semua transaction items yang dikerjakan teknisi ini
      const whereClause: any = {
        technicianId,
        transaction: { status: "Paid" },
      };

      if (month && typeof month === "string") {
        const [year, mon] = month.split("-").map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const endDate = new Date(year, mon, 1);
        whereClause.transaction = {
          ...whereClause.transaction,
          createdAt: { gte: startDate, lt: endDate },
        };
      }

      const items = await prisma.transactionItem.findMany({
        where: whereClause,
        include: { transaction: true },
      });

      const incentiveRate = Number(user.incentiveRate) || 0;
      const incentiveType = user.incentiveType || "None";

      let totalUnits = 0;
      let totalRevenue = 0;

      items.forEach((item) => {
        totalUnits += item.quantity;
        totalRevenue += Number(item.price) * item.quantity;
      });

      // Hitung insentif berdasarkan tipe
      let totalIncentive = 0;
      if (incentiveType === "PerUnit") {
        totalIncentive = totalUnits * incentiveRate;
      } else if (incentiveType === "Percentage") {
        totalIncentive = (totalRevenue * incentiveRate) / 100;
      }

      return res.status(200).json({
        technicianId,
        name: user.name,
        totalUnits,
        totalRevenue,
        totalIncentive,
        incentiveRate,
        incentiveType,
        transactions: new Set(items.map((i) => i.transactionId)).size,
      });
    }

    // Tanpa technicianId: kembalikan ringkasan semua teknisi
    const technicians = await prisma.user.findMany({
      where: { role: { name: "Technician" } },
    });

    return res.status(200).json({ technicians, total: technicians.length });
  } catch (error) {
    console.error("Incentives error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
