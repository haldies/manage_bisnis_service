import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let [users, branches, categories, inventory, stocks, services, transactions, shifts, leaveRequests, cashAdvances, overtimes, serviceTypes, deviceModels, storeProfile, stockTransfers, inventoryUnits, attendances] = await Promise.all([

      prisma.user.findMany({
        include: {
          role: {
            include: { permissions: true }
          }
        }
      }),
      prisma.branch.findMany(),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.inventoryItem.findMany({ include: { category: true } }),
      prisma.stock.findMany(),
      prisma.serviceTicket.findMany({ include: { spareparts: true } }),
      prisma.transaction.findMany({ include: { items: true }, take: 50, orderBy: { date: 'desc' } }),
      prisma.shift.findMany(),
      prisma.leaveRequest.findMany(),
      prisma.cashAdvance.findMany(),
      prisma.overtime.findMany(),
      prisma.serviceType.findMany(),
      prisma.deviceModel.findMany({ orderBy: { name: 'asc' } }),
      prisma.storeProfile.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default', tenantId: 'default' }
      }),
      prisma.stockTransfer.findMany({
        include: { 
          items: { include: { item: true } },
          fromBranch: true,
          toBranch: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.inventoryUnit.findMany({
        orderBy: { entryDate: 'desc' }
      }),
      prisma.attendance.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500
      })
    ]);


    // Pre-populate if empty
    if (deviceModels.length === 0) {
      const defaultDevices = [
        { name: "iPhone 11", brand: "Apple", type: "Smartphone" },
        { name: "iPhone 12 Pro Max", brand: "Apple", type: "Smartphone" },
        { name: "iPhone 13", brand: "Apple", type: "Smartphone" },
        { name: "iPhone 14 Pro", brand: "Apple", type: "Smartphone" },
        { name: "iPhone 15", brand: "Apple", type: "Smartphone" },
        { name: "iPhone 16 Pro Max", brand: "Apple", type: "Smartphone" },
        { name: "iPhone 17 Pro Max", brand: "Apple", type: "Smartphone" },
        { name: "MacBook Air M1", brand: "Apple", type: "Laptop" },
        { name: "iPad Pro 11-inch", brand: "Apple", type: "Tablet" }
      ];
      await prisma.deviceModel.createMany({ data: defaultDevices });
      deviceModels = await prisma.deviceModel.findMany({ orderBy: { name: 'asc' } });
    }


    return res.status(200).json({ 
      users, branches, categories, inventory, stocks, services, transactions, shifts, leaveRequests, cashAdvances, overtimes, serviceTypes, deviceModels, storeProfile, stockTransfers, inventoryUnits, attendances 
    });




  } catch (error: any) {
    console.error('Init API Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
