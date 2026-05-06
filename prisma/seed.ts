import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Multi-Branch RBAC database...');

  const password6 = await bcrypt.hash('123456', 10);

  // 1. Cabang
  const jakarta = await prisma.branch.upsert({
    where: { id: 'branch-jakarta' },
    update: {},
    create: {
      id: 'branch-jakarta',
      tenantId: 'default',
      name: 'Cabang Jakarta (Pusat)',
      address: 'Jl. Sudirman, Jakarta',
      phone: '0811111111',
      latitude: -6.2088,
      longitude: 106.8456,
    },
  });

  const bandung = await prisma.branch.upsert({
    where: { id: 'branch-bandung' },
    update: {},
    create: {
      id: 'branch-bandung',
      tenantId: 'default',
      name: 'Cabang Bandung',
      address: 'Jl. Asia Afrika, Bandung',
      phone: '0822222222',
      latitude: -6.9175,
      longitude: 107.6191,
    },
  });

  const surabaya = await prisma.branch.upsert({
    where: { id: 'branch-surabaya' },
    update: {},
    create: {
      id: 'branch-surabaya',
      tenantId: 'default',
      name: 'Cabang Surabaya',
      address: 'Jl. Tunjungan, Surabaya',
      phone: '0833333333',
      latitude: -7.2575,
      longitude: 112.7521,
    },
  });

  // 2. Roles
  const modules = ['Dashboard', 'POS', 'Service', 'Inventory', 'Finance', 'Staff', 'Transactions', 'Settings'];

  const superAdminRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Super Admin', tenantId: 'default' } },
    update: {},
    create: {
      name: 'Super Admin',
      tenantId: 'default',
      permissions: { create: modules.map(m => ({ module: m, canRead: true, canCreate: true, canUpdate: true, canDelete: true })) }
    }
  });

  const adminRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Admin', tenantId: 'default' } },
    update: {},
    create: {
      name: 'Admin',
      tenantId: 'default',
      permissions: { create: modules.map(m => ({ module: m, canRead: true, canCreate: true, canUpdate: true, canDelete: m !== 'Finance' })) }
    }
  });

  const managerRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Manager', tenantId: 'default' } },
    update: {},
    create: {
      name: 'Manager',
      tenantId: 'default',
      permissions: { create: modules.map(m => ({ module: m, canRead: true, canCreate: true, canUpdate: true, canDelete: false })) }
    }
  });

  const cashierRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Cashier', tenantId: 'default' } },
    update: {},
    create: {
      name: 'Cashier',
      tenantId: 'default',
      permissions: { create: modules.map(m => ({
        module: m,
        canRead:   ['POS', 'Service', 'Inventory', 'Transactions', 'Dashboard'].includes(m),
        canCreate: ['POS', 'Service'].includes(m),
        canUpdate: ['POS', 'Service', 'Settings'].includes(m),
        canDelete: m === 'POS',
      })) }
    }
  });

  const techRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Technician', tenantId: 'default' } },
    update: {},
    create: {
      name: 'Technician',
      tenantId: 'default',
      permissions: { create: modules.map(m => ({
        module: m,
        canRead:   ['Service', 'Inventory', 'Transactions'].includes(m),
        canCreate: false,
        canUpdate: m === 'Service',
        canDelete: false,
      })) }
    }
  });

  // 3. Shift
  const shiftPagi = await prisma.shift.upsert({
    where: { id: 'shift-pagi' },
    update: {},
    create: {
      id: 'shift-pagi',
      name: 'Shift Pagi',
      startTime: new Date(2024, 0, 1, 8, 0),
      endTime: new Date(2024, 0, 1, 16, 0),
      branchId: jakarta.id,
      tenantId: 'default'
    }
  });

  // 4. Users
  const usersToSeed = [
    // Global — Super Admin & Admin
    { username: 'admin',  name: 'Super Admin',        roleId: superAdminRole.id, branchId: jakarta.id },
    { username: 'admin2', name: 'Admin Operasional',   roleId: adminRole.id,      branchId: jakarta.id },
    // Jakarta
    { username: 'budi', name: 'Budi (Manager JKT)', roleId: managerRole.id, branchId: jakarta.id },
    { username: 'siti', name: 'Siti (Kasir JKT)', roleId: cashierRole.id, branchId: jakarta.id },
    { username: 'agus', name: 'Agus (Teknisi JKT)', roleId: techRole.id, branchId: jakarta.id },
    // Bandung
    { username: 'dedi', name: 'Dedi (Manager BDG)', roleId: managerRole.id, branchId: bandung.id },
    { username: 'lina', name: 'Lina (Kasir BDG)', roleId: cashierRole.id, branchId: bandung.id },
    { username: 'sep', name: 'Asep (Teknisi BDG)', roleId: techRole.id, branchId: bandung.id },
    // Surabaya
    { username: 'rudi', name: 'Rudi (Manager SBY)', roleId: managerRole.id, branchId: surabaya.id },
    { username: 'maya', name: 'Maya (Kasir SBY)', roleId: cashierRole.id, branchId: surabaya.id },
    { username: 'eko', name: 'Eko (Teknisi SBY)', roleId: techRole.id, branchId: surabaya.id },
  ];

  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { password: password6, branchId: u.branchId, roleId: u.roleId },
      create: { 
        ...u, 
        password: password6, 
        tenantId: 'default', 
        shiftId: shiftPagi.id 
      }
    });
  }

  // 5. Categories, Models, Services, Items (Master Data)
  const categories = ['Elektronik', 'Sparepart', 'Aksesoris', 'Jasa'];
  for (const catName of categories) {
    await prisma.category.upsert({ where: { name: catName }, update: {}, create: { name: catName, tenantId: 'default' } });
  }

  const models = [
    { brand: 'Apple', name: 'iPhone 15 Pro', type: 'Smartphone' },
    { brand: 'Samsung', name: 'Galaxy S24 Ultra', type: 'Smartphone' },
  ];
  for (const m of models) {
    await prisma.deviceModel.upsert({ where: { name: m.name }, update: {}, create: { ...m, tenantId: 'default' } });
  }

  const services = [
    { name: 'Ganti LCD Premium', price: 1500000 },
    { name: 'Ganti Baterai Original', price: 450000 },
  ];
  for (const s of services) {
    await prisma.serviceType.upsert({ where: { name: s.name }, update: {}, create: { ...s, tenantId: 'default' } });
  }

  const catElektronik = await prisma.category.findFirst({ where: { name: 'Elektronik' } });
  const items = [
    { name: 'Kabel Data Type-C', sku: 'KBL-001', basePrice: 75000, costPrice: 35000, unit: 'Pcs' },
    { name: 'Charger 20W PD', sku: 'CHG-001', basePrice: 150000, costPrice: 85000, unit: 'Pcs' },
  ];
  for (const i of items) {
    await prisma.inventoryItem.upsert({ where: { sku: i.sku }, update: {}, create: { ...i, tenantId: 'default', categoryId: catElektronik?.id || 'default-cat', showInPos: true } });
  }

  console.log('✅ All data seeded successfully according to ACCOUNTS.md');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
