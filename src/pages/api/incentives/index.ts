import type { NextApiRequest, NextApiResponse } from "next";
import { MOCK_TRANSACTIONS, MOCK_USERS } from "@/lib/mock-data";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { technicianId, month } = req.query; // month format: YYYY-MM

  if (!technicianId) {
    return res.status(400).json({ error: "technicianId is required" });
  }

  const user = MOCK_USERS.find(u => u.id === technicianId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Base incentive per unit (from config or employee profile)
  const incentivePerUnit = 25000; 

  // Filter transactions for this technician
  const techTransactions = MOCK_TRANSACTIONS.filter(trx => {
    if (trx.status !== 'Paid') return false;
    
    // Check if any item was handled by this technician
    const hasTechItem = trx.items.some(item => item.technicianId === technicianId);
    
    if (month && typeof month === 'string') {
      const trxMonth = new Date(trx.date).toISOString().substring(0, 7);
      return hasTechItem && trxMonth === month;
    }
    
    return hasTechItem;
  });

  // Calculate stats
  let totalUnits = 0;
  let totalRevenue = 0;

  techTransactions.forEach(trx => {
    trx.items.forEach(item => {
      if (item.technicianId === technicianId) {
        totalUnits += item.quantity;
        totalRevenue += (item.price * item.quantity);
      }
    });
  });

  const totalIncentive = totalUnits * incentivePerUnit;

  return res.status(200).json({
    technicianId,
    name: user.name,
    totalUnits,
    totalRevenue,
    totalIncentive,
    incentivePerUnit,
    transactions: techTransactions.length,
  });
}
