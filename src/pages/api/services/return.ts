/**
 * POST /api/services/return
 * Proses return servis (klaim garansi) — membuat transaksi koreksi negatif
 * Body: { ticketId: string, returnReason: string, cashierId: string }
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { ticketId, returnReason, cashierId } = req.body;
  if (!ticketId || !returnReason) {
    return res.status(400).json({ message: 'ticketId dan returnReason wajib diisi' });
  }

  try {
    const ticket = await prisma.serviceTicket.findUnique({
      where: { id: String(ticketId) },
      include: { spareparts: { include: { item: true } } }
    });

    if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan' });
    if (ticket.status !== 'Completed') {
      return res.status(400).json({ message: 'Hanya tiket berstatus Completed yang bisa direturn' });
    }

    // Note: warranty expiry is no longer a hard block — expired warranty shows a
    // warning in the UI but the return is still allowed to proceed manually.
    const warrantyExpired = ticket.warrantyExpiry ? new Date() > ticket.warrantyExpiry : false;

    // Cari transaksi asal
    const originalTx = await prisma.transaction.findFirst({
      where: { notes: `service:${ticketId}` },
      include: { items: true }
    });

    let returnTxId: string | null = null;

    if (originalTx) {
      // Buat transaksi koreksi (nilai negatif = refund/pengurangan pendapatan)
      const returnTx = await prisma.transaction.create({
        data: {
          tenantId: 'default',
          branchId: ticket.branchId,
          cashierId: cashierId || ticket.technicianId || ticket.branchId,
          source: 'Service',
          total: -Number(originalTx.total),
          paymentMethod: originalTx.paymentMethod,
          amountPaid: -Number(originalTx.total),
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
          change: 0,
          tax: 0,
          discount: 0,
          status: 'Success',
          notes: `return:${ticketId}`,
          items: {
            create: originalTx.items.map((item) => ({
              tenantId: 'default',
              itemId: item.itemId,
              name: `[RETURN] ${item.name}`,
              category: item.category,
              price: -Number(item.price),
              costPrice: Number(item.costPrice),
              quantity: item.quantity,
              discount: 0,
            }))
          }
        }
      });
      returnTxId = returnTx.id;
    }

    // Update tiket ke status Returned
    const updated = await prisma.serviceTicket.update({
      where: { id: String(ticketId) },
      data: {
        status: 'Returned',
        returnReason,
        returnedAt: new Date(),
        returnTxId,
      },
      include: { spareparts: { include: { item: true } } }
    });

    return res.status(200).json({
      ticket: updated,
      returnTxId,
      warrantyExpired,
      message: 'Return berhasil diproses',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error memproses return' });
  }
}
