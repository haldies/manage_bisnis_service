/**
 * Generates an auto-incremented document number in the format PREFIX-YYYYMMDD-XXXX.
 *
 * @param prefix - Document prefix, e.g. "PO", "GR", "SO", "SR", "AUD"
 * @param model  - Prisma model delegate (e.g. prisma.purchaseOrder)
 * @returns      - e.g. "PO-20240115-0001"
 */
export async function generateDocNumber(prefix: string, model: any): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await model.count({
    where: { createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) } },
  });
  return `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}
