import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { subDays, startOfDay, addHours, format } from 'date-fns';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting DEMO Seeding (30 Days Data)...');

  const password6 = await bcrypt.hash('123456', 10);
  const tenantId = 'default';

  // 1. Cabang
  const branches = [
    { id: 'branch-jakarta', name: 'Cabang Jakarta (Pusat)', address: 'Jl. Sudirman', phone: '0811', lat: -6.20, lng: 106.84 },
    { id: 'branch-bandung', name: 'Cabang Bandung', address: 'Jl. Asia Afrika', phone: '0822', lat: -6.91, lng: 107.61 },
    { id: 'branch-surabaya', name: 'Cabang Surabaya', address: 'Jl. Tunjungan', phone: '0833', lat: -7.25, lng: 112.75 },
  ];

  for (const b of branches) {
    await prisma.branch.upsert({
      where: { id: b.id },
      update: {},
      create: { id: b.id, tenantId, name: b.name, address: b.address, phone: b.phone, latitude: b.lat, longitude: b.lng }
    });
  }

  // 2. Roles
  const modules = ['Dashboard', 'POS', 'Service', 'Inventory', 'Finance', 'Staff', 'Transactions', 'Settings'];
  const ownerRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Owner', tenantId } },
    update: {},
    create: { name: 'Owner', tenantId, permissions: { create: modules.map(m => ({ module: m, canRead: true, canCreate: true, canUpdate: true, canDelete: true })) } }
  });

  const managerRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Manager', tenantId } },
    update: {},
    create: { name: 'Manager', tenantId, permissions: { create: modules.map(m => ({ module: m, canRead: true, canCreate: true, canUpdate: true, canDelete: false })) } }
  });

  const cashierRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Cashier', tenantId } },
    update: {},
    create: { name: 'Cashier', tenantId, permissions: { create: modules.map(m => ({ module: m, canRead: m === 'Cashier' || m === 'Inventory', canCreate: m === 'Cashier', canUpdate: false, canDelete: false })) } }
  });

  const techRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Technician', tenantId } },
    update: {},
    create: { name: 'Technician', tenantId, permissions: { create: modules.map(m => ({ module: m, canRead: m === 'Service', canCreate: m === 'Service', canUpdate: true, canDelete: false })) } }
  });

  // 3. Users
  const usersData = [
    { username: 'admin', name: 'Super Admin', roleId: ownerRole.id, branchId: 'branch-jakarta', baseSalary: 10000000, joinDate: subDays(new Date(), 400) },
    { username: 'budi', name: 'Budi (Manager)', roleId: managerRole.id, branchId: 'branch-jakarta', baseSalary: 7000000, joinDate: subDays(new Date(), 365) },
    { username: 'siti', name: 'Siti (Kasir)', roleId: cashierRole.id, branchId: 'branch-jakarta', baseSalary: 3500000, joinDate: subDays(new Date(), 200) },
    { username: 'agus', name: 'Agus (Teknisi)', roleId: techRole.id, branchId: 'branch-jakarta', baseSalary: 4500000, joinDate: subDays(new Date(), 300) },
    { username: 'dedi', name: 'Dedi (Manager)', roleId: managerRole.id, branchId: 'branch-bandung', baseSalary: 6500000, joinDate: subDays(new Date(), 365) },
    { username: 'lina', name: 'Lina (Kasir)', roleId: cashierRole.id, branchId: 'branch-bandung', baseSalary: 3300000, joinDate: subDays(new Date(), 100) },
    { username: 'rudi', name: 'Rudi (Manager)', roleId: managerRole.id, branchId: 'branch-surabaya', baseSalary: 6500000, joinDate: subDays(new Date(), 450) },
    { username: 'maya', name: 'Maya (Kasir)', roleId: cashierRole.id, branchId: 'branch-surabaya', baseSalary: 3300000, joinDate: subDays(new Date(), 50) },
  ];

  const users: any[] = [];
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { password: password6 },
      create: { ...u, password: password6, tenantId }
    });
    users.push(user);
  }

  // 4. Master Data
  const categories = ['Elektronik', 'Sparepart', 'Aksesoris', 'Jasa'];
  const catIds: Record<string, string> = {};
  for (const c of categories) {
    const cat = await prisma.category.upsert({ where: { name: c }, update: {}, create: { name: c, tenantId } });
    catIds[c] = cat.id;
  }

  const items = [
    { name: 'Kabel Data Type-C', sku: 'KBL-001', bp: 75000, cp: 25000, cat: 'Aksesoris' },
    { name: 'Charger 20W', sku: 'CHG-001', bp: 150000, cp: 65000, cat: 'Elektronik' },
    { name: 'LCD iPhone 11', sku: 'LCD-IP11', bp: 850000, cp: 450000, cat: 'Sparepart' },
    { name: 'Baterai Samsung S20', sku: 'BAT-S20', bp: 350000, cp: 150000, cat: 'Sparepart' },
    { name: 'Tempered Glass', sku: 'TG-UNI', bp: 50000, cp: 5000, cat: 'Aksesoris' },
  ];

  const dbItems: any[] = [];
  for (const i of items) {
    const item = await prisma.inventoryItem.upsert({
      where: { sku: i.sku },
      update: {},
      create: { name: i.name, sku: i.sku, basePrice: i.bp, costPrice: i.cp, unit: 'Pcs', categoryId: catIds[i.cat], tenantId, showInPos: true }
    });
    dbItems.push(item);
  }

  // 4.5. Initialize Stocks for all branches
  console.log('📦 Initializing stocks for all branches...');
  for (const item of dbItems) {
    for (const b of branches) {
      await prisma.stock.upsert({
        where: { itemId_branchId: { itemId: item.id, branchId: b.id } },
        update: {},
        create: {
          itemId: item.id,
          branchId: b.id,
          quantity: 50 + Math.floor(Math.random() * 50), // Random stock between 50-100
          minStock: 10,
          tenantId
        }
      });
    }
  }

  const serviceTypes = [
    { name: 'Ganti LCD', price: 250000, incentiveValue: 10, incentiveType: 'Percentage' },
    { name: 'Ganti Baterai', price: 150000, incentiveValue: 15000, incentiveType: 'Flat' },
    { name: 'Service Mesin', price: 500000, incentiveValue: 15, incentiveType: 'Percentage' },
    { name: 'Software Update', price: 100000, incentiveValue: 5000, incentiveType: 'Flat' },
  ];
  for (const s of serviceTypes) {
    await prisma.serviceType.upsert({ 
      where: { name: s.name }, 
      update: { 
        price: s.price, 
        incentiveValue: s.incentiveValue, 
        incentiveType: s.incentiveType 
      }, 
      create: { 
        name: s.name, 
        price: s.price, 
        tenantId, 
        incentiveValue: s.incentiveValue, 
        incentiveType: s.incentiveType 
      } 
    });
  }

  // Bonus Pools Seeding
  console.log('💰 Seeding Bonus Pools...');
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  await prisma.bonusPool.createMany({
    data: [
      { name: 'Bonus Target Cabang Jakarta', amount: 10000000, month: currentMonth, year: currentYear, branchId: 'branch-jakarta', tenantId },
      { name: 'Bonus Tim Kasir Nasional', amount: 5000000, month: currentMonth, year: currentYear, roleId: cashierRole.id, tenantId },
      { name: 'Bonus Spesial Agus', amount: 1000000, month: currentMonth, year: currentYear, employeeId: users.find(u => u.name.includes('Agus'))?.id, tenantId },
    ]
  });

  // 5. TRANSAKSI & ABSENSI (30 HARI)
  console.log('📅 Generating 30 days of data. Please wait...');
  
  for (let d = 30; d >= 0; d--) {
    const date = startOfDay(subDays(new Date(), d));
    const dateStr = format(date, 'yyyy-MM-dd');
    
    process.stdout.write(`\r⏳ Processing Day ${30 - d + 1}/31: ${dateStr} ... `);

    // -- Absensi per hari (Batch) --
    const attendances = [];
    for (const u of users) {
      if (Math.random() > 0.1) {
        attendances.push({
          employeeId: u.id,
          employeeName: u.name,
          branchId: u.branchId,
          tenantId,
          date: date,
          checkInTime: addHours(date, 8 + Math.random()),
          checkOutTime: addHours(date, 17 + Math.random()),
          status: (Math.random() > 0.8 ? 'Late' : 'Present') as any,
          isInRadius: true,
          isMockGPS: false,
        });
      }
    }
    if (attendances.length > 0) {
      await prisma.attendance.createMany({ data: attendances });
    }

    // -- Transaksi per hari (5-15 trx) --
    const numTrx = 5 + Math.floor(Math.random() * 10);
    for (let t = 0; t < numTrx; t++) {
      const branchId = branches[Math.floor(Math.random() * 3)].id;
      const cashier = users.find(u => u.branchId === branchId && u.roleId === cashierRole.id) || users[0];
      const randomItem = dbItems[Math.floor(Math.random() * dbItems.length)];
      const qty = 1 + Math.floor(Math.random() * 3);
      const total = Number(randomItem.basePrice) * qty;

      await prisma.transaction.create({
        data: {
          tenantId,
          branchId,
          cashierId: cashier.id,
          date: addHours(date, 9 + Math.random() * 10),
          source: 'POS',
          total: total,
          amountPaid: total,
          change: 0,
          paymentMethod: 'Cash',
          status: 'Success',
          tax: 0,
          discount: 0,
          items: {
            create: [{
              tenantId,
              itemId: randomItem.id,
              name: randomItem.name,
              category: items.find(i => i.sku === randomItem.sku)?.cat || 'Lainnya',
              price: randomItem.basePrice,
              costPrice: randomItem.costPrice,
              quantity: qty
            }]
          }
        }
      });
    }

    // -- Drama Servis (1-3 per hari) --
    if (d % 2 === 0) {
      const branchId = branches[Math.floor(Math.random() * 3)].id;
      const tech = users.find(u => u.branchId === branchId && u.roleId === techRole.id) || users[0];
      const issues = [
        { issue: 'LCD Pecah (Jatuh dari motor)', note: 'Customer rewel minta cepat', status: 'Completed' as const },
        { issue: 'Mati Total (Kena air laut)', note: 'Diagnosis: Korosi parah, kemungkinan gagal', status: 'Cancelled' as const },
        { issue: 'Ganti Baterai', note: 'Customer minta diskon 10%', status: 'InProgress' as const },
        { issue: 'Sinyal Hilang', note: 'Sudah ganti IC RF tapi masih nihil', status: 'Pending' as const }
      ];
      const selected = issues[Math.floor(Math.random() * issues.length)];

      await prisma.serviceTicket.create({
        data: {
          tenantId,
          branchId,
          customerName: 'Customer ' + (100 + d),
          customerPhone: '0857' + d,
          deviceModel: d % 2 === 0 ? 'iPhone 13' : 'Galaxy S22',
          deviceSerial: 'SN-' + d + 'XYZ',
          issue: selected.issue,
          diagnosis: selected.note,
          status: selected.status as any,
          serviceFee: 150000 + (Math.random() * 200000),
          estimatedCost: 500000 + (Math.random() * 1000000),
          technicianId: tech.id,
          dateOpened: date,
          dateClosed: selected.status === 'Completed' ? addHours(date, 48) : null
        }
      });
    }

    // -- Drama Karyawan (Lembur, Kasbon, Izin) --
    if (d % 5 === 0) {
      const luckyUser = users[Math.floor(Math.random() * users.length)];
      
      // Kasbon (Drama butuh duit)
      await prisma.cashAdvance.create({
        data: {
          tenantId,
          employeeId: luckyUser.id,
          amount: 100000 + (Math.floor(Math.random() * 5) * 100000),
          reason: 'Kebutuhan mendesak / Cicilan motor',
          status: 'Approved',
          date: date
        }
      });

      // Lembur (Drama kejar target)
      await prisma.overtime.create({
        data: {
          tenantId,
          employeeId: luckyUser.id,
          hours: 2 + Math.floor(Math.random() * 3),
          reason: 'Banyak antrian servis menumpuk',
          status: 'Approved',
          date: date
        }
      });
    }
  }

  // 6. Store Profile (Set penalties for realistic payroll)
  await prisma.storeProfile.upsert({
    where: { id: 'default' },
    update: {
      latePenalty: 25000,
      absentPenalty: 100000,
      overtimeRate: 20000,
      baseSalary: 3000000,
    },
    create: {
      id: 'default',
      tenantId,
      name: 'Kasirai POS Demo',
      latePenalty: 25000,
      absentPenalty: 100000,
      overtimeRate: 20000,
      baseSalary: 3000000,
    }
  });

  console.log('\n✅ REALISTIC DEMO SEED COMPLETED!');
}

main()
  .catch((e) => { console.error('\n❌ Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
