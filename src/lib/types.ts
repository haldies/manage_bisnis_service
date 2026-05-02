export type Role = string;
export type ModuleName = 'Cashier' | 'Service' | 'Inventory' | 'Finance' | 'Staff' | 'Transactions' | 'Printers';
export type AccessLevel = 'None' | 'Read' | 'Full';
export type RolePermission = Record<ModuleName, AccessLevel>;


export type WageType = 'Monthly' | 'Daily' | 'Hourly';

export type User = {
  id: string;
  name: string;
  role: Role;
  email?: string;    // For Firebase Auth integration with Absensi app
  branchId?: string; // If undefined, applies to all branches (Admin)
  password?: string;      // For auth
  baseSalary?: number;
  allowance?: number;
  phone?: string;
  address?: string;
  // --- New HR Fields ---
  wageType?: WageType;
  wageRate?: number; // Nilai per jam/hari (jika bukan monthly)
  insuranceDed?: number; // Potongan asuransi (BPJS, dll)
  shiftId?: string; // Referensi ke Shift default
  leaveQuota?: number; // Jatah cuti per tahun
  incentiveRate?: number;
  incentiveType?: 'None' | 'Service' | 'Retail' | 'All';
};

export type Shift = {
  id: string;
  name: string; // e.g., "Pagi", "Siang", "Malam"
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "16:00"
  branchId: string;
};

export type CashAdvance = {
  id: string;
  employeeId: string;
  date: number;
  amount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Deducted';
};

export type LeaveType = 'Sakit' | 'Cuti Tahunan' | 'Izin' | 'Libur Nasional';

export type LeaveRequest = {
  id: string;
  employeeId: string;
  startDate: number;
  endDate: number;
  type: LeaveType;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};


export type Branch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
};

export type Category = {
  id: string;
  name: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category?: Category | undefined;
  costPrice: number;
  basePrice: number;
  unit: string;
  rack?: string;
  supplierId?: string;
  image?: string;
  showInPos?: boolean;
  warranty?: string;
  dateAdded?: number;
};


export type Stock = {
  id: string;
  itemId: string;
  branchId: string;
  quantity: number;
  reservedQty: number;
  minStock: number;
};

export type InventoryUnit = {
  id: string;
  itemId: string;
  branchId: string;
  serialNumber?: string;
  status: 'Available' | 'Sold' | 'Defective' | 'Returned';
  costPrice?: number;
  entryDate: number;
  soldDate?: number;
};


export type PaymentMethod = 'Cash' | 'QRIS' | 'Transfer' | 'Kasbon';

export type CartItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  quantity: number;
  sku?: string;
  technicianId?: string;
  discount?: number;
  serviceTicketId?: string;
  itemId?: string; // Untuk data dari database (Prisma)
  warranty?: string;
};

export type Transaction = {
  id: string;
  date: number;
  branchId: string;
  cashierId: string;
  source: 'Retail' | 'Service';
  serviceTicketId?: string; 
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  change: number;
  tax: number;
  discount: number;
  status: 'Paid' | 'Unpaid' | 'Canceled';
  notes?: string;
  queueNumber?: string;
  cashierName?: string;
};

export type ServiceStatus =
  | 'Pending'           // Step 1: Terima Device
  | 'Diagnosed'         // Step 2: Selesai Diagnosa
  | 'WaitingApproval'   // Step 3: Menunggu ACC Customer
  | 'Approved'          // Step 3: ACC Lanjut Pengerjaan
  | 'InProgress'        // Sedang Dikerjakan
  | 'ReadyToPay'        // Menunggu Pembayaran
  | 'Paid'              // Sudah Bayar / Lunas
  | 'Completed'         // Step 4: Selesai (Siap Masuk Kasir)
  | 'Delivered'         // Sudah Diambil & Lunas (Selesai Kasir)
  | 'Cancelled';

export type ServiceType = {
  id: string;
  name: string;
  price: number;
  category?: string;
};


export type DeviceModel = {
  id: string;
  name: string;
  brand: string;
  type: string;
};

export type ServiceTicket = {
  id: string;
  dateOpened: number;
  dateClosed?: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string; // New field added
  deviceModel: string;
  deviceSerial: string;
  issue: string;
  diagnosis?: string;
  estimatedCost: number;
  serviceFee: number;
  status: ServiceStatus;
  technicianId?: string;
  spareparts: CartItem[]; // Sparepart yang digunakan
  branchId: string;
  updatedAt?: number;
};

// ─── SUPPLIER & PO ──────────────────────────────────────────────────────
export type Supplier = {
  id: string;
  name: string;
  contact: string;
  address: string;
  items: string[]; // List of inventory item IDs they provide
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  date: number;
  items: { itemId: string, quantity: number, costPrice: number }[];
  total: number;
  status: 'Pending' | 'Ordered' | 'Received' | 'Canceled';
  branchId: string;
};

// ─── MUTASI & TRANSFER ──────────────────────────────────────────────────
export type StockTransferStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Cancelled';

export type StockTransferItem = {
  id: string;
  transferId: string;
  itemId: string;
  quantity: number;
  itemName?: string; // For UI
};

export type StockTransfer = {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  status: StockTransferStatus;
  items: StockTransferItem[];
  notes?: string;
  createdAt: number;
  fromBranchName?: string;
  toBranchName?: string;
};


// ─── FINANCE ────────────────────────────────────────────────────────────
export type FinanceLog = {
  id: string;
  date: number;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  description: string;
  branchId: string;
  transactionId?: string;
};

// ─── ATTENDANCE ──────────────────────────────────────────────────────────
export type Attendance = {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  date: string;
  checkInTime: number;
  status: 'hadir' | 'terlambat' | 'izin' | 'sakit';
  isInRadius: boolean;
  isMockGPS: boolean;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  checkOutTime?: number;
  checkOutPhotoUrl?: string;
  workDurationMinutes?: number;
  createdAt: string;
};

export type StoreProfile = {
  id?: string;
  name: string;
  address: string;
  phone: string;
  taxPercentage: number;
  enableTax: boolean;
  serviceIncentivePercentage: number;
  startTime: string;
  endTime: string;
  baseSalary: number;
  attendanceRate: number;
  latePenalty: number;
  absentPenalty: number;
  overtimeRate: number;
  totalWorkDays: number;
  serviceIncentive: number;
  updatedAt?: string;
};

export type ReceiptSettings = {
  paperWidth: '58mm' | '80mm' | '58mm-on-80mm';
  showQueueNumber: boolean;
  showStoreAddress: boolean;
  showStorePhone: boolean;
  showCustomerName: boolean;
  showCashierName: boolean;
  showTax: boolean;
  showDiscount: boolean;
  receiptFooter: string;
};
