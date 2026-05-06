
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 0. Update Enum Types in DB (PostgreSQL)
    // We add new values first
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "TransactionSource" ADD VALUE 'Service'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "TransactionStatus" ADD VALUE 'Success'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "PaymentMethod" ADD VALUE 'Cash'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "PaymentMethod" ADD VALUE 'Transfer'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "PaymentMethod" ADD VALUE 'EWallet'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "AttendanceStatus" ADD VALUE 'Present'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "AttendanceStatus" ADD VALUE 'Late'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "AttendanceStatus" ADD VALUE 'Absent'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "AttendanceStatus" ADD VALUE 'Leave'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "StockOutType" ADD VALUE 'InternalUse'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "StockOutType" ADD VALUE 'Damaged'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "StockOutType" ADD VALUE 'Lost'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "StockOutType" ADD VALUE 'Adjustment'`); } catch(e){}
    try { await prisma.$executeRawUnsafe(`ALTER TYPE "SupplierReturnReason" ADD VALUE 'WrongItem'`); } catch(e){}

    // 1. Transaction Source: SERVICE -> Service
    const res1 = await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "source" = 'Service' WHERE "source" = 'SERVICE'`);
    
    // 2. Transaction Status: SUCCESS -> Success
    const res2 = await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "status" = 'Success' WHERE "status" = 'SUCCESS'`);

    // 3. Payment Method
    await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "paymentMethod" = 'Cash' WHERE "paymentMethod" = 'CASH'`);
    await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "paymentMethod" = 'Transfer' WHERE "paymentMethod" = 'TRANSFER'`);
    await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "paymentMethod" = 'EWallet' WHERE "paymentMethod" = 'E_WALLET'`);

    // 4. Attendance
    await prisma.$executeRawUnsafe(`UPDATE "Attendance" SET "status" = 'Present' WHERE "status" = 'PRESENT'`);
    await prisma.$executeRawUnsafe(`UPDATE "Attendance" SET "status" = 'Late' WHERE "status" = 'LATE'`);
    await prisma.$executeRawUnsafe(`UPDATE "Attendance" SET "status" = 'Absent' WHERE "status" = 'ABSENT'`);
    await prisma.$executeRawUnsafe(`UPDATE "Attendance" SET "status" = 'Leave' WHERE "status" = 'LEAVE'`);

    // 5. Stock Out
    await prisma.$executeRawUnsafe(`UPDATE "StockOut" SET "type" = 'InternalUse' WHERE "type" = 'INTERNAL_USE'`);
    await prisma.$executeRawUnsafe(`UPDATE "StockOut" SET "type" = 'Damaged' WHERE "type" = 'DAMAGED'`);
    await prisma.$executeRawUnsafe(`UPDATE "StockOut" SET "type" = 'Lost' WHERE "type" = 'LOST'`);
    await prisma.$executeRawUnsafe(`UPDATE "StockOut" SET "type" = 'Adjustment' WHERE "type" = 'ADJUSTMENT'`);

    // 6. Supplier Return
    await prisma.$executeRawUnsafe(`UPDATE "SupplierReturnItem" SET "reason" = 'WrongItem' WHERE "reason" = 'Wrong_Item'`);

    console.log('Migration completed!');
    return res.status(200).json({ message: 'Migration successful' });
  } catch (error: any) {
    console.error('Migration error:', error);
    return res.status(500).json({ message: 'Migration failed', error: error.message });
  }
}
