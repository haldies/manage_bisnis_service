import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { status } = req.body;

    try {
      const currentTransfer = await prisma.stockTransfer.findUnique({
        where: { id: id as string },
        include: { items: true }
      });

      if (!currentTransfer) return res.status(404).json({ message: 'Transfer not found' });

      // 1. Protection: If status is already changed by someone else
      if (status !== 'Completed' && status !== 'Approved' && status !== 'Rejected' && status !== 'Cancelled') {
         return res.status(400).json({ message: 'Status tidak valid.' });
      }
      
      // Prevent double action (e.g. someone else already approved/rejected)
      if (currentTransfer.status !== 'Pending' && status === 'Approved') {
        return res.status(400).json({ message: 'Mutasi ini sudah diproses oleh orang lain.' });
      }
      if ((currentTransfer.status as string) === 'Completed') {
        return res.status(400).json({ message: 'Mutasi ini sudah selesai dan tidak bisa diubah.' });
      }

      // 2. Stock Check (Only on Completion)
      if (status === 'Completed' && (currentTransfer.status as string) !== 'Completed') {
        for (const item of currentTransfer.items) {
           const sourceStock = await prisma.stock.findUnique({
              where: { itemId_branchId: { itemId: item.itemId, branchId: currentTransfer.fromBranchId } }
           });
           if (!sourceStock || sourceStock.quantity < item.quantity) {
              return res.status(400).json({ message: `Gagal! Stok ${item.itemId} di cabang sumber tidak mencukupi saat ini.` });
           }
        }
        
        await prisma.$transaction(async (tx) => {
          for (const item of currentTransfer.items) {
            // Deduct from Source (fromBranchId)
            await tx.stock.upsert({
              where: { itemId_branchId: { itemId: item.itemId, branchId: currentTransfer.fromBranchId } },
              update: { quantity: { decrement: item.quantity } },
              create: { itemId: item.itemId, branchId: currentTransfer.fromBranchId, quantity: -item.quantity }
            });

            // Add to Destination (toBranchId)
            await tx.stock.upsert({
              where: { itemId_branchId: { itemId: item.itemId, branchId: currentTransfer.toBranchId } },
              update: { quantity: { increment: item.quantity } },
              create: { itemId: item.itemId, branchId: currentTransfer.toBranchId, quantity: item.quantity }
            });
          }

          await tx.stockTransfer.update({
            where: { id: id as string },
            data: { status: 'Completed' }
          });
        });
        
        const updated = await prisma.stockTransfer.findUnique({
          where: { id: id as string },
          include: { items: { include: { item: true } }, fromBranch: true, toBranch: true }
        });
        return res.status(200).json(updated);
      }

      // Simple status update (Approved, Rejected)
      const updated = await prisma.stockTransfer.update({
        where: { id: id as string },
        data: { status },
        include: { items: { include: { item: true } }, fromBranch: true, toBranch: true }
      });
      return res.status(200).json(updated);

    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  }

  return res.status(405).end();
}
