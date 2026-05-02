import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { branchId, cashierId, source, items, total, paymentMethod, amountPaid, customerName, customerPhone, customerAddress, change, tax, discount, status, notes } = req.body;

    // Use a transaction to ensure all operations succeed or fail together
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create the transaction record
      const newTx = await tx.transaction.create({
        data: {
          branchId,
          cashierId,
          source,
          total,
          paymentMethod,
          amountPaid,
          customerName,
          customerPhone,
          customerAddress: customerAddress || null,
          change,
          tax,
          discount,
          status,
          notes,
          items: {
            create: items.map((item: any) => ({
              itemId: (item.id?.startsWith('svc-') || !item.id) ? null : item.id,
              name: item.name,
              category: item.categoryName || item.category || 'Uncategorized',
              price: item.price,
              costPrice: item.costPrice || 0,
              quantity: item.quantity,
              discount: item.discount || 0,
              technicianId: item.technicianId || null
            }))
          }
        },
        include: { items: true }
      });

      // 2. Update stock for each item
      for (const item of items) {
        if (item.id && !item.id.startsWith('svc-')) {
        // Find existing stock record
        const stock = await tx.stock.findUnique({
          where: {
            itemId_branchId: {
              itemId: item.id,
              branchId: branchId
            }
          }
        });

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: Math.max(0, stock.quantity - item.quantity) }
          });
          }
        }
      }

      return newTx;
    });

    return res.status(201).json(transaction);
  } catch (error) {
    console.error('Transaction Error:', error);
    return res.status(500).json({ message: 'Internal server error', error });
  }
}
