import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const types = await prisma.serviceType.findMany({
        include: {
          deviceModels: {
            include: { deviceModel: true }
          }
        }
      });
      return res.status(200).json(types);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching service types' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, price, category, feeType, feeValue, incentiveType, incentiveValue, deviceModelIds } = req.body;

      const newType = await prisma.serviceType.create({
        data: {
          name,
          price: parseFloat(price) || 0,
          category: category || null,
          feeType: feeType || 'Flat',
          feeValue: parseFloat(feeValue) || 0,
          incentiveType: incentiveType || 'Percentage',
          incentiveValue: parseFloat(incentiveValue) || 0,
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
      return res.status(201).json(newType);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating service type' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
