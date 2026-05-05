/**
 * Seed script: Service Types & Device Models
 *
 * Struktur:
 * - 6 jenis jasa (LCD, Baterai, Backglass, Housing, Kamera Belakang, Kamera Depan)
 * - 31 model iPhone
 * - Harga per model disimpan di kolom `price` pada relasi ServiceTypeDeviceModel
 *
 * Strategi harga (sumber: data CSV):
 * - LCD            → kolom "1 tahun"
 * - Baterai        → kolom "1 tahun"
 * - Backglass      → kolom "1 bulan"
 * - Housing        → kolom "1 bulan"
 * - Kamera Belakang → kolom "3 bulan"
 * - Kamera Depan   → kolom "3 bulan"
 */

import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Device Models ───────────────────────────────────────────────────────────

const iPhoneModels = [
  'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus',
  'iPhone 7', 'iPhone 7 Plus',
  'iPhone 8', 'iPhone 8 Plus',
  'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
  'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
  'iPhone 12', 'iPhone 12 mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
  'iPhone 13', 'iPhone 13 mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
  'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
  'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
];

// ─── Harga per Model per Jenis Jasa ──────────────────────────────────────────

// LCD — harga "1 tahun"
const lcdPrices: Record<string, number> = {
  'iPhone 6': 300000, 'iPhone 6 Plus': 380000, 'iPhone 6s': 395000, 'iPhone 6s Plus': 425000,
  'iPhone 7': 460000, 'iPhone 7 Plus': 595000,
  'iPhone 8': 625000, 'iPhone 8 Plus': 650000,
  'iPhone X': 900000, 'iPhone XR': 945000, 'iPhone XS': 965000, 'iPhone XS Max': 985000,
  'iPhone 11': 1100000, 'iPhone 11 Pro': 1250000, 'iPhone 11 Pro Max': 1300000,
  'iPhone 12': 1500000, 'iPhone 12 mini': 1750000, 'iPhone 12 Pro': 1650000, 'iPhone 12 Pro Max': 2000000,
  'iPhone 13': 2000000, 'iPhone 13 mini': 2000000, 'iPhone 13 Pro': 3000000, 'iPhone 13 Pro Max': 3000000,
  'iPhone 14': 2000000, 'iPhone 14 Plus': 2650000, 'iPhone 14 Pro': 3800000, 'iPhone 14 Pro Max': 0,
  'iPhone 15': 3800000, 'iPhone 15 Plus': 0, 'iPhone 15 Pro': 3900000, 'iPhone 15 Pro Max': 0,
};

// Baterai — harga "1 tahun"
const bateraiPrices: Record<string, number> = {
  'iPhone 6': 140000, 'iPhone 6 Plus': 175000, 'iPhone 6s': 165000, 'iPhone 6s Plus': 175000,
  'iPhone 7': 175000, 'iPhone 7 Plus': 205000,
  'iPhone 8': 240000, 'iPhone 8 Plus': 250000,
  'iPhone X': 300000, 'iPhone XR': 310000, 'iPhone XS': 315000, 'iPhone XS Max': 330000,
  'iPhone 11': 380000, 'iPhone 11 Pro': 390000, 'iPhone 11 Pro Max': 400000,
  'iPhone 12': 450000, 'iPhone 12 mini': 450000, 'iPhone 12 Pro': 480000, 'iPhone 12 Pro Max': 490000,
  'iPhone 13': 490000, 'iPhone 13 mini': 500000, 'iPhone 13 Pro': 580000, 'iPhone 13 Pro Max': 600000,
  'iPhone 14': 680000, 'iPhone 14 Plus': 655000, 'iPhone 14 Pro': 755000, 'iPhone 14 Pro Max': 825000,
  'iPhone 15': 830000, 'iPhone 15 Plus': 840000, 'iPhone 15 Pro': 985000, 'iPhone 15 Pro Max': 1075000,
};

// Backglass — harga "1 bulan"
const backglassPrices: Record<string, number> = {
  'iPhone 6': 0, 'iPhone 6 Plus': 0, 'iPhone 6s': 0, 'iPhone 6s Plus': 0,
  'iPhone 7': 0, 'iPhone 7 Plus': 0,
  'iPhone 8': 100000, 'iPhone 8 Plus': 100000,
  'iPhone X': 150000, 'iPhone XR': 150000, 'iPhone XS': 200000, 'iPhone XS Max': 200000,
  'iPhone 11': 250000, 'iPhone 11 Pro': 250000, 'iPhone 11 Pro Max': 285000,
  'iPhone 12': 290000, 'iPhone 12 mini': 290000, 'iPhone 12 Pro': 300000, 'iPhone 12 Pro Max': 300000,
  'iPhone 13': 350000, 'iPhone 13 mini': 350000, 'iPhone 13 Pro': 375000, 'iPhone 13 Pro Max': 390000,
  'iPhone 14': 400000, 'iPhone 14 Plus': 450000, 'iPhone 14 Pro': 480000, 'iPhone 14 Pro Max': 500000,
  'iPhone 15': 550000, 'iPhone 15 Plus': 550000, 'iPhone 15 Pro': 600000, 'iPhone 15 Pro Max': 650000,
};

// Housing — harga "1 bulan"
const housingPrices: Record<string, number> = {
  'iPhone 6': 200000, 'iPhone 6 Plus': 200000, 'iPhone 6s': 200000, 'iPhone 6s Plus': 200000,
  'iPhone 7': 250000, 'iPhone 7 Plus': 270000,
  'iPhone 8': 285000, 'iPhone 8 Plus': 300000,
  'iPhone X': 325000, 'iPhone XR': 350000, 'iPhone XS': 400000, 'iPhone XS Max': 480000,
  'iPhone 11': 490000, 'iPhone 11 Pro': 580000, 'iPhone 11 Pro Max': 590000,
  'iPhone 12': 500000, 'iPhone 12 mini': 550000, 'iPhone 12 Pro': 640000, 'iPhone 12 Pro Max': 650000,
  'iPhone 13': 500000, 'iPhone 13 mini': 550000, 'iPhone 13 Pro': 700000, 'iPhone 13 Pro Max': 700000,
  'iPhone 14': 550000, 'iPhone 14 Plus': 550000, 'iPhone 14 Pro': 800000, 'iPhone 14 Pro Max': 880000,
  'iPhone 15': 700000, 'iPhone 15 Plus': 700000, 'iPhone 15 Pro': 850000, 'iPhone 15 Pro Max': 850000,
};

// Kamera Belakang — harga "3 bulan"
const kamBelakangPrices: Record<string, number> = {
  'iPhone 6': 125000, 'iPhone 6 Plus': 125000, 'iPhone 6s': 135000, 'iPhone 6s Plus': 150000,
  'iPhone 7': 155000, 'iPhone 7 Plus': 300000,
  'iPhone 8': 270000, 'iPhone 8 Plus': 380000,
  'iPhone X': 385000, 'iPhone XR': 395000, 'iPhone XS': 495000, 'iPhone XS Max': 495000,
  'iPhone 11': 350000, 'iPhone 11 Pro': 785000, 'iPhone 11 Pro Max': 790000,
  'iPhone 12': 600000, 'iPhone 12 mini': 800000, 'iPhone 12 Pro': 1100000, 'iPhone 12 Pro Max': 1250000,
  'iPhone 13': 500000, 'iPhone 13 mini': 500000, 'iPhone 13 Pro': 1250000, 'iPhone 13 Pro Max': 1350000,
  'iPhone 14': 980000, 'iPhone 14 Plus': 900000, 'iPhone 14 Pro': 1250000, 'iPhone 14 Pro Max': 1300000,
  'iPhone 15': 900000, 'iPhone 15 Plus': 950000, 'iPhone 15 Pro': 1350000, 'iPhone 15 Pro Max': 1450000,
};

// Kamera Depan — harga "3 bulan"
const kamDepanPrices: Record<string, number> = {
  'iPhone 6': 100000, 'iPhone 6 Plus': 145000, 'iPhone 6s': 150000, 'iPhone 6s Plus': 165000,
  'iPhone 7': 170000, 'iPhone 7 Plus': 180000,
  'iPhone 8': 180000, 'iPhone 8 Plus': 185000,
  'iPhone X': 190000, 'iPhone XR': 200000, 'iPhone XS': 225000, 'iPhone XS Max': 225000,
  'iPhone 11': 240000, 'iPhone 11 Pro': 260000, 'iPhone 11 Pro Max': 280000,
  'iPhone 12': 280000, 'iPhone 12 mini': 285000, 'iPhone 12 Pro': 290000, 'iPhone 12 Pro Max': 320000,
  'iPhone 13': 350000, 'iPhone 13 mini': 350000, 'iPhone 13 Pro': 350000, 'iPhone 13 Pro Max': 365000,
  'iPhone 14': 550000, 'iPhone 14 Plus': 580000, 'iPhone 14 Pro': 590000, 'iPhone 14 Pro Max': 600000,
  'iPhone 15': 600000, 'iPhone 15 Plus': 750000, 'iPhone 15 Pro': 800000, 'iPhone 15 Pro Max': 850000,
};

// ─── Definisi Jenis Jasa ─────────────────────────────────────────────────────

const serviceTypes = [
  { name: 'LCD',             category: 'iPhone', prices: lcdPrices },
  { name: 'Baterai',         category: 'iPhone', prices: bateraiPrices },
  { name: 'Backglass',       category: 'iPhone', prices: backglassPrices },
  { name: 'Housing',         category: 'iPhone', prices: housingPrices },
  { name: 'Kamera Belakang', category: 'iPhone', prices: kamBelakangPrices },
  { name: 'Kamera Depan',    category: 'iPhone', prices: kamDepanPrices },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding service types & device models...\n');

  // 1. Upsert device models
  console.log('📱 Upserting device models...');
  const deviceModelMap: Record<string, string> = {};

  for (const modelName of iPhoneModels) {
    const dm = await prisma.deviceModel.upsert({
      where: { name: modelName },
      update: {},
      create: {
        name: modelName,
        brand: 'Apple',
        type: 'Smartphone',
        tenantId: 'default',
      },
    });
    deviceModelMap[modelName] = dm.id;
    await sleep(30);
  }
  console.log(`  ✅ ${iPhoneModels.length} device models siap\n`);

  // 2. Upsert 6 jenis jasa, lalu link ke setiap model dengan harga spesifik
  for (const { name, category, prices } of serviceTypes) {
    console.log(`🔧 Upserting jenis jasa: ${name}...`);

    // Upsert service type (harga default 0 — harga aktual ada di relasi per model)
    const serviceType = await prisma.serviceType.upsert({
      where: { name },
      update: { category },
      create: {
        name,
        category,
        price: 0,          // harga default; harga aktual per model ada di relasi
        feeType: 'Flat',
        feeValue: 0,
        incentiveType: 'Percentage',
        incentiveValue: 0,
        tenantId: 'default',
      },
    });

    // Upsert relasi ke setiap model dengan harga spesifik
    let linked = 0;
    for (const modelName of iPhoneModels) {
      const deviceModelId = deviceModelMap[modelName];
      const price = prices[modelName] ?? 0;

      await prisma.serviceTypeDeviceModel.upsert({
        where: {
          serviceTypeId_deviceModelId: {
            serviceTypeId: serviceType.id,
            deviceModelId,
          },
        },
        update: { price },
        create: {
          serviceTypeId: serviceType.id,
          deviceModelId,
          price,
        },
      });
      linked++;
      await sleep(30);
    }

    console.log(`  ✅ ${name} — ${linked} model di-link\n`);
  }

  console.log('✅ Selesai!');
  console.log(`   Jenis jasa: ${serviceTypes.length}`);
  console.log(`   Device models: ${iPhoneModels.length}`);
  console.log(`   Total relasi: ${serviceTypes.length * iPhoneModels.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
