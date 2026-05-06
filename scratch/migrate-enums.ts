
import { PrismaClient } from '../prisma/generated/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  // 1. Transaction Source: SERVICE -> Service
  const res1 = await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "source" = 'Service' WHERE "source" = 'SERVICE'`);
  console.log(`Updated ${res1} transactions source`);

  // 2. Transaction Status: SUCCESS -> Success
  const res2 = await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "status" = 'Success' WHERE "status" = 'SUCCESS'`);
  console.log(`Updated ${res2} transactions status`);

  // 3. Payment Method: CASH -> Cash, TRANSFER -> Transfer, E_WALLET -> EWallet
  await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "paymentMethod" = 'Cash' WHERE "paymentMethod" = 'CASH'`);
  await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "paymentMethod" = 'Transfer' WHERE "paymentMethod" = 'TRANSFER'`);
  await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET "paymentMethod" = 'EWallet' WHERE "paymentMethod" = 'E_WALLET'`);
  console.log(`Updated payment methods in transactions`);

  // 4. Attendance Status: PRESENT -> Present, LATE -> Late, ABSENT -> Absent, LEAVE -> Leave
  await prisma.$executeRawUnsafe(`UPDATE "Attendance" SET "status" = 'Present' WHERE "status" = 'PRESENT'`);
  await prisma.$executeRawUnsafe(`UPDATE "Attendance" SET "status" = 'Late' WHERE "status" = 'LATE'`);
  await prisma.$executeRawUnsafe(`UPDATE "Attendance" SET "status" = 'Absent' WHERE "status" = 'ABSENT'`);
  await prisma.$executeRawUnsafe(`UPDATE "Attendance" SET "status" = 'Leave' WHERE "status" = 'LEAVE'`);
  console.log(`Updated attendance status`);

  // 5. Stock Out Type: INTERNAL_USE -> InternalUse, DAMAGED -> Damaged, LOST -> Lost, ADJUSTMENT -> Adjustment
  await prisma.$executeRawUnsafe(`UPDATE "StockOut" SET "type" = 'InternalUse' WHERE "type" = 'INTERNAL_USE'`);
  await prisma.$executeRawUnsafe(`UPDATE "StockOut" SET "type" = 'Damaged' WHERE "type" = 'DAMAGED'`);
  await prisma.$executeRawUnsafe(`UPDATE "StockOut" SET "type" = 'Lost' WHERE "type" = 'LOST'`);
  await prisma.$executeRawUnsafe(`UPDATE "StockOut" SET "type" = 'Adjustment' WHERE "type" = 'ADJUSTMENT'`);
  console.log(`Updated stock out types`);

  // 6. Supplier Return Reason: Wrong_Item -> WrongItem
  await prisma.$executeRawUnsafe(`UPDATE "SupplierReturnItem" SET "reason" = 'WrongItem' WHERE "reason" = 'Wrong_Item'`);
  console.log(`Updated supplier return reasons`);

  console.log('Migration completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
