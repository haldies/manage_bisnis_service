import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { name, price, category, feeType, feeValue, incentiveType, incentiveValue, deviceModelIds } = req.body;

      // Replace device model relations
      if (deviceModelIds !== undefined) {
        await prisma.serviceTypeDeviceModel.deleteMany({
          where: { serviceTypeId: String(id) }
        });
      }

      const updated = await prisma.serviceType.update({
        where: { id: String(id) },
        data: {
          name,
          price: price !== undefined ? parseFloat(price) : undefined,
          category: category !== undefined ? category || null : undefined,
          feeType: feeType || undefined,
          feeValue: feeValue !== undefined ? parseFloat(feeValue) : undefined,
          incentiveType: incentiveType || undefined,
          incentiveValue: incentiveValue !== undefined ? parseFloat(incentiveValue) : undefined,
          deviceModels: deviceModelIds?.length
            ? {
                create: (deviceModelIds as string[]).map((deviceModelId) => ({ deviceModelId }))
              }
            : undefined
        },
        include: {
          deviceModels: {
            include: { deviceModel: true }
          }
        }
      });
      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating service type' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.serviceTypeDeviceModel.deleteMany({ where: { serviceTypeId: String(id) } });
      await prisma.serviceType.delete({ where: { id: String(id) } });
      return res.status(200).json({ message: 'Deleted' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting service type' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
