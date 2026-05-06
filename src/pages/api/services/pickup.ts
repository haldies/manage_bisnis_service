/**
 * POST /api/services/pickup
 *
 * Two-phase endpoint:
 *   Phase 1 — Search:  { code }
 *     → Returns the matching ReadyForPickup ticket for confirmation preview.
 *
 *   Phase 2 — Confirm: { code, confirm: true, pickedUpBy, paymentMethod, amountPaid }
 *     → Updates ticket to Completed, sets pickedUpAt/pickedUpBy, and creates a
 *       Service transaction in one atomic operation.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { code, confirm, pickedUpBy, paymentMethod, amountPaid } = req.body;
  if (!code) return res.status(400).json({ message: 'Kode pengambilan wajib diisi' });

  try {
    // Find ticket by pickupCode or last-6-chars of ID, must be ReadyForPickup
    const ticket = await prisma.serviceTicket.findFirst({
      where: {
        OR: [
          { pickupCode: String(code).toUpperCase() },
          { id: { endsWith: String(code).toLowerCase() } },
        ],
        status: 'ReadyForPickup',
      },
      include: { spareparts: { include: { item: true } } },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan atau status tidak sesuai' });
    }

    // ── Phase 1: search only ─────────────────────────────────────────────
    if (!confirm) {
      return res.status(200).json({ ticket, message: 'Tiket ditemukan' });
    }

    // ── Phase 2: confirm pickup + create transaction ──────────────────────
    if (!pickedUpBy || !paymentMethod || amountPaid === undefined) {
      return res.status(400).json({
        message: 'pickedUpBy, paymentMethod, dan amountPaid wajib diisi untuk konfirmasi',
      });
    }

    // Calculate total cost from spareparts + serviceFee
    const sparepartTotal = (ticket as any).spareparts.reduce(
      (sum: number, sp: any) => sum + Number(sp.price) * Number(sp.quantity),
      0
    );
    const totalCost = sparepartTotal + Number(ticket.serviceFee ?? 0);
    const paid = Number(amountPaid);
    const change = Math.max(0, paid - totalCost);

    // Check for duplicate transaction
    const existingTx = await prisma.transaction.findFirst({
      where: { notes: `service:${ticket.id}` },
    });

    const now = new Date();

    // Run update + transaction creation atomically
    const [updatedTicket, transaction] = await prisma.$transaction(async (tx) => {
      const updated = await tx.serviceTicket.update({
        where: { id: ticket.id },
        data: {
          status: 'Completed',
          pickedUpAt: now,
          pickedUpBy: String(pickedUpBy),
          dateClosed: now,
        },
        include: { spareparts: { include: { item: true } } },
      });

      // Only create transaction if one doesn't already exist
      let newTx = existingTx;
      if (!existingTx) {
        newTx = await tx.transaction.create({
          data: {
            tenantId: 'default',
            branchId: ticket.branchId,
            cashierId: ticket.technicianId ?? ticket.branchId,
            source: 'Service',
            total: totalCost,
            paymentMethod: String(paymentMethod) as any,
            amountPaid: paid,
            change,
            customerName: ticket.customerName,
            customerPhone: ticket.customerPhone ?? '',
            tax: 0,
            discount: 0,
            status: 'Success',
            notes: `service:${ticket.id}`,
            items: {
              create: [
                // One line item per sparepart
                ...(ticket as any).spareparts.map((sp: any) => ({
                  tenantId: 'default',
                  itemId: sp.itemId ?? sp.id,
                  name: sp.item?.name ?? 'Sparepart',
                  category: 'Sparepart',
                  price: Number(sp.price),
                  costPrice: Number(sp.item?.costPrice ?? 0),
                  quantity: Number(sp.quantity),
                  discount: 0,
                })),
                // One line item for service fee
                ...(Number(ticket.serviceFee) > 0
                  ? [
                      {
                        tenantId: 'default',
                        itemId: null,
                        name: 'Biaya Jasa Servis',
                        category: 'Service',
                        price: Number(ticket.serviceFee),
                        costPrice: 0,
                        quantity: 1,
                        discount: 0,
                      },
                    ]
                  : []),
              ],
            },
          },
        });
      }

      return [updated, newTx];
    });

    return res.status(200).json({
      ticket: updatedTicket,
      transaction,
      message: 'Pengambilan berhasil dikonfirmasi',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error memproses pengambilan' });
  }
}
