import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const updated = await prisma.transaction.update({
        where: { id: String(id) },
        data: req.body,
        include: { items: true }
      });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating transaction' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Delete items first (no cascade in schema)
      await prisma.transactionItem.deleteMany({ where: { transactionId: String(id) } });
      await prisma.transaction.delete({ where: { id: String(id) } });
      return res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
      console.error('Delete transaction error:', error);
      return res.status(500).json({ message: 'Error deleting transaction' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
