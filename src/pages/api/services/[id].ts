import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

function generatePickupCode(): string {
  return randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F9C2"
}

/**
 * Valid status transitions for ServiceTicket.
 * Any transition not listed here will be rejected with a 400 error.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending:          ['InProgress', 'Cancelled'],
  InProgress:      ['ReadyForPickup', 'OnHold', 'Cancelled'],
  OnHold:          ['InProgress', 'ReadyForPickup', 'Cancelled'],
  ReadyForPickup: ['Completed', 'InProgress'],
  Completed:        ['Returned'],
  Returned:         ['InProgress'],
  Cancelled:        ['Pending'],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ message: 'Missing ID' });

  // ─── GET single ticket ───────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const ticket = await prisma.serviceTicket.findUnique({
        where: { id: String(id) },
        include: { spareparts: { include: { item: true } } }
      });
      if (!ticket) return res.status(404).json({ message: 'Not found' });
      return res.status(200).json(ticket);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching ticket' });
    }
  }

  // ─── PUT update ticket ───────────────────────────────────────────────
  if (req.method === 'PUT') {
    try {
      const {
        status, diagnosis, estimatedCost, serviceFee, dateClosed, technicianId, spareparts,
        warrantyDays, pickupCode, pickedUpAt, pickedUpBy,
        returnReason, returnedAt, returnTxId,
        preCheckData, postCheckData,
        paymentStatus, dpAmount,
      } = req.body;

      // Validate status transition
      if (status !== undefined) {
        const current = await prisma.serviceTicket.findUnique({
          where: { id: String(id) },
          select: { status: true },
        });
        if (!current) return res.status(404).json({ message: 'Tiket tidak ditemukan' });

        const allowedNext = VALID_TRANSITIONS[current.status] ?? [];
        if (current.status !== status && !allowedNext.includes(status)) {
          return res.status(400).json({
            message: `Transisi status tidak valid: ${current.status} → ${status}. Status yang diizinkan: ${allowedNext.join(', ') || 'tidak ada'}`,
          });
        }
      }

      // Sync spareparts
      if (spareparts !== undefined) {
        await prisma.serviceSparepart.deleteMany({ where: { ticketId: String(id) } });
        if (spareparts.length > 0) {
          await prisma.serviceSparepart.createMany({
            data: spareparts.map((p: any) => ({
              ticketId: String(id),
              itemId: p.itemId || p.id,
              quantity: p.quantity || 1,
              price: p.price,
              tenantId: 'default',
            }))
          });
        }
      }

      // Auto-generate pickup code when moving to READY_FOR_PICKUP
      let resolvedPickupCode = pickupCode;
      if (status === 'ReadyForPickup' && !pickupCode) {
        const existing = await prisma.serviceTicket.findUnique({ where: { id: String(id) } });
        if (!existing?.pickupCode) {
          let code = generatePickupCode();
          let attempts = 0;
          while (attempts < 10) {
            const conflict = await prisma.serviceTicket.findFirst({ where: { pickupCode: code } });
            if (!conflict) break;
            code = generatePickupCode();
            attempts++;
          }
          resolvedPickupCode = code;
        } else {
          resolvedPickupCode = existing.pickupCode;
        }
      }

      // Set readyAt timestamp when moving to READY_FOR_PICKUP
      const readyAt = status === 'ReadyForPickup' ? new Date() : undefined;

      // Compute warrantyExpiry when completing
      let warrantyExpiry: Date | undefined;
      if (status === 'Completed' && warrantyDays && warrantyDays > 0) {
        warrantyExpiry = new Date();
        warrantyExpiry.setDate(warrantyExpiry.getDate() + warrantyDays);
      }

      const updated = await prisma.serviceTicket.update({
        where: { id: String(id) },
        data: {
          ...(status !== undefined && { status }),
          ...(diagnosis !== undefined && { diagnosis }),
          ...(estimatedCost !== undefined && { estimatedCost }),
          ...(serviceFee !== undefined && { serviceFee }),
          ...(technicianId !== undefined && { technicianId }),
          ...(dateClosed !== undefined && { dateClosed: dateClosed ? new Date(dateClosed) : null }),
          ...(warrantyDays !== undefined && { warrantyDays }),
          ...(warrantyExpiry && { warrantyExpiry }),
          ...(resolvedPickupCode !== undefined && { pickupCode: resolvedPickupCode }),
          ...(pickedUpAt !== undefined && { pickedUpAt: pickedUpAt ? new Date(pickedUpAt) : null }),
          ...(pickedUpBy !== undefined && { pickedUpBy }),
          ...(returnReason !== undefined && { returnReason }),
          ...(returnedAt !== undefined && { returnedAt: returnedAt ? new Date(returnedAt) : null }),
          ...(returnTxId !== undefined && { returnTxId }),
          ...(preCheckData !== undefined && { preCheckData }),
          ...(postCheckData !== undefined && { postCheckData }),
          ...(paymentStatus !== undefined && { paymentStatus }),
          ...(dpAmount !== undefined && { dpAmount: Number(dpAmount) }),
          ...(readyAt !== undefined && { readyAt }),
        },
        include: { spareparts: { include: { item: true } } }
      });
      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating service ticket' });
    }
  }

  // ─── DELETE ──────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
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
