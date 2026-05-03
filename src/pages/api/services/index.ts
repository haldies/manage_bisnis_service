import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const services = await prisma.serviceTicket.findMany({ include: { spareparts: true } });
    return res.status(200).json(services);
  }

  if (req.method === 'POST') {
    try {
      const { 
        customerName, customerPhone, customerAddress, deviceModel, 
        deviceSerial, issue, estimatedCost, serviceFee, status, 
        branchId, dateOpened, technicianId 
      } = req.body;
      
      const newService = await prisma.serviceTicket.create({
        data: {
          tenantId: 'default',
          customerName, customerPhone, customerAddress, deviceModel, deviceSerial, issue, 
          estimatedCost: estimatedCost || 0, serviceFee: serviceFee || 0, status, 
          branchId: branchId || 'b1', dateOpened: dateOpened ? new Date(dateOpened) : new Date(),
          technicianId
        },
        include: { spareparts: true }
      });

      return res.status(201).json(newService);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating service ticket' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
