import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ message: 'Missing ID' });

  if (req.method === 'PUT') {
    try {
      const { status, diagnosis, estimatedCost, serviceFee, dateClosed, technicianId, spareparts } = req.body;
      
      if (spareparts) {
        await prisma.serviceSparepart.deleteMany({ where: { ticketId: String(id) } });
        await prisma.serviceSparepart.createMany({
          data: spareparts.map((p: any) => ({
            ticketId: String(id),
            itemId: p.itemId || p.id,
            quantity: p.quantity || 1,
            price: p.price
          }))
        });
      }

      const updated = await prisma.serviceTicket.update({
        where: { id: String(id) },
        data: { 
          status, diagnosis, estimatedCost, serviceFee, technicianId,
          dateClosed: dateClosed ? new Date(dateClosed) : undefined 
        },
        include: { spareparts: { include: { item: true } } }
      });
      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating service ticket' });
    }
  }


  if (req.method === 'DELETE') {
    try {
      console.log('Attempting to delete service ticket:', id);
      await prisma.serviceSparepart.deleteMany({ where: { ticketId: String(id) } });
      await prisma.serviceTicket.deleteMany({ where: { id: String(id) } });
      return res.status(200).json({ message: 'Deleted successfully' });
    } catch (error: any) {
      console.error('API Delete Error:', error);
      return res.status(500).json({ message: 'Error deleting service ticket', error: error.message });
    }
  }


  return res.status(405).json({ message: 'Method not allowed' });
}
