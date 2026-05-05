import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

/** Generate a 6-character alphanumeric uppercase pickup code, e.g. "A3F9C2" */
function generatePickupCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

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
        branchId, dateOpened, technicianId,
        // New fields
        preCheckData, postCheckData,
        warrantyDays, warrantyExpiry,
        pickupCode: providedPickupCode,
      } = req.body;

      // Auto-generate a unique pickup code if not provided
      let pickupCode = providedPickupCode ?? null;
      if (!pickupCode) {
        let code = generatePickupCode();
        let attempts = 0;
        while (attempts < 10) {
          const conflict = await prisma.serviceTicket.findFirst({ where: { pickupCode: code } });
          if (!conflict) break;
          code = generatePickupCode();
          attempts++;
        }
        pickupCode = code;
      }

      // Compute warrantyExpiry from warrantyDays if not explicitly provided
      const openedDate = dateOpened ? new Date(dateOpened) : new Date();
      let resolvedWarrantyExpiry: Date | undefined;
      if (warrantyExpiry) {
        resolvedWarrantyExpiry = new Date(warrantyExpiry);
      } else if (warrantyDays && Number(warrantyDays) > 0) {
        resolvedWarrantyExpiry = new Date(openedDate.getTime() + Number(warrantyDays) * 86_400_000);
      }

      // Resolve branchId — fall back to the first branch in the database if not provided
      let resolvedBranchId = branchId || null;
      if (!resolvedBranchId) {
        const firstBranch = await prisma.branch.findFirst({ select: { id: true } });
        resolvedBranchId = firstBranch?.id;
        if (!resolvedBranchId) {
          return res.status(400).json({ message: 'No branch found. Please configure a branch first.' });
        }
      }

      const newService = await prisma.serviceTicket.create({
        data: {
          tenantId: 'default',
          customerName,
          customerPhone,
          customerAddress,
          deviceModel,
          deviceSerial,
          issue,
          estimatedCost: estimatedCost || 0,
          serviceFee: serviceFee || 0,
          status: status || 'Pending',
          branchId: resolvedBranchId,
          dateOpened: openedDate,
          technicianId,
          pickupCode,
          ...(warrantyDays !== undefined && { warrantyDays: Number(warrantyDays) }),
          ...(resolvedWarrantyExpiry && { warrantyExpiry: resolvedWarrantyExpiry }),
          ...(preCheckData !== undefined && { preCheckData }),
          ...(postCheckData !== undefined && { postCheckData }),
        },
        include: { spareparts: true },
      });

      return res.status(201).json(newService);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating service ticket' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
