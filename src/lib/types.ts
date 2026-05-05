export type ModuleName = 'Cashier' | 'Service' | 'Inventory' | 'Finance' | 'Staff' | 'Transactions' | 'Printers';
export type AccessLevel = 'None' | 'Read' | 'Full';

export interface Permission {
  id: string;
  roleId: string;
  module: ModuleName;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export type WageType = 'Monthly' | 'Daily' | 'Hourly';

export type User = {
  id: string;
  name: string;
  roleId: string;
  role?: Role;
  joinDate?: string;
  createdAt?: string;
  email?: string;
  branchId?: string;
  password?: string;
  baseSalary?: number;
  allowance?: number;
  phone?: string;
  address?: string;
  wageType?: WageType;
  wageRate?: number;
  insuranceDed?: number;
  shiftId?: string;
  leaveQuota?: number;
  incentiveRate?: number;
  incentiveType?: 'None' | 'Service' | 'Retail' | 'Profit' | 'All';
  incentiveMode?: 'Percentage' | 'Flat';
};

export type Shift = {
  id: string;
  name: string; // e.g., "Pagi", "Siang", "Malam"
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "16:00"
  branchId: string;
};

export type BonusPool = {
  id: string;
  name: string;
  amount: number;
  month: number;
  year: number;
  roleId?: string;
  branchId?: string;
  employeeId?: string;
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


export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'E_WALLET' | 'Cash' | 'QRIS' | 'Transfer';

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
  itemId?: string;
  warranty?: string;
  needsOrder?: boolean;   // stok habis, perlu dipesan via PO
  poReference?: string;   // nomor PO yang dibuat untuk item ini
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
  status: 'SUCCESS' | 'CANCELLED' | 'PENDING' | 'Paid' | 'Unpaid' | 'Canceled';
  notes?: string;
  queueNumber?: string;
  cashierName?: string;
};

export type ServiceStatus =
  | 'Pending'           // Masuk — unit baru diterima
  | 'InProgress'        // Proses — sedang dikerjakan
  | 'OnHold'            // Ditunda — tunggu sparepart / apapun
  | 'WaitingApproval'   // Konfirmasi Harga — menunggu persetujuan pelanggan
  | 'ReadyForPickup'    // Siap Diambil — selesai, menunggu pengambilan
  | 'Completed'         // Selesai — sudah diambil & lunas
  | 'Returned'          // Return / klaim garansi
  | 'Cancelled';        // Dibatalkan

// Checklist item untuk teknisi
export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  note?: string;
};

export type ChecklistData = {
  items: ChecklistItem[];
  completedAt?: number;
  completedBy?: string;
};

export type ServiceType = {
  id: string;
  name: string;
  price: number;
  category?: string;
  feeType?: 'Flat' | 'Percentage';
  feeValue?: number;
  incentiveType?: 'Percentage' | 'Flat';
  incentiveValue?: number;
  deviceModels?: { deviceModelId: string; deviceModel: DeviceModel; price?: number }[];
};


export type DeviceModel = {
  id: string;
  name: string;
  brand: string;
  type: string;
};

export type ServicePaymentStatus = 'Unpaid' | 'DP' | 'Paid';

export type ServiceTicket = {
  id: string;
  dateOpened: number;
  dateClosed?: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  deviceModel: string;
  deviceSerial: string;
  issue: string;
  diagnosis?: string;
  estimatedCost: number;
  serviceFee: number;
  status: ServiceStatus;
  technicianId?: string;
  spareparts: CartItem[];
  branchId: string;
  updatedAt?: number;
  incentiveType?: 'Percentage' | 'Flat';
  incentiveValue?: number;
  // Garansi
  warrantyDays?: number;
  warrantyExpiry?: number;
  // Pengambilan unit
  pickupCode?: string;
  pickedUpAt?: number;
  pickedUpBy?: string;
  // Return / klaim garansi
  returnReason?: string;
  returnedAt?: number;
  returnTxId?: string;
  // Checklist teknisi
  preCheckData?: ChecklistData;
  postCheckData?: ChecklistData;
  // Pembayaran
  paymentStatus?: ServicePaymentStatus;
  dpAmount?: number;        // jumlah DP yang sudah dibayar
  readyAt?: number;         // timestamp saat masuk ReadyForPickup (untuk aging)
};

// ─── SUPPLIER & PO ──────────────────────────────────────────────────────
export type Supplier = {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
};

export type PurchaseOrderStatus = 'Draft' | 'Sent' | 'Partial' | 'Received' | 'Cancelled';

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: Supplier;
  branchId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  totalAmount: number;
  items: PurchaseOrderItem[];
};

export type PurchaseOrderItem = {
  id: string;
  itemId: string;
  item?: InventoryItem;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
};

export type GoodsReceipt = {
  id: string;
  grNumber: string;
  poId: string;
  po?: PurchaseOrder;
  branchId: string;
  receiptDate: string;
  notes?: string;
  items: GoodsReceiptItem[];
};

export type GoodsReceiptItem = {
  id: string;
  itemId: string;
  item?: InventoryItem;
  quantity: number;
  unitPrice: number;
};

export type StockOutType = 'InternalUse' | 'Damaged' | 'Lost' | 'Adjustment';

export type StockOut = {
  id: string;
  soNumber: string;
  branchId: string;
  type: StockOutType;
  date: string;
  reason: string;
  notes?: string;
  items: StockOutItem[];
};

export type StockOutItem = {
  id: string;
  itemId: string;
  item?: InventoryItem;
  quantity: number;
};

export type SupplierReturnStatus = 'Draft' | 'Sent' | 'Completed';
export type SupplierReturnReason = 'Defective' | 'WrongItem' | 'Overstock' | 'Other';

export type SupplierReturn = {
  id: string;
  srNumber: string;
  supplierId: string;
  supplier?: Supplier;
  branchId: string;
  grId?: string;
  status: SupplierReturnStatus;
  returnDate: string;
  notes?: string;
  items: SupplierReturnItem[];
};

export type SupplierReturnItem = {
  id: string;
  itemId: string;
  item?: InventoryItem;
  quantity: number;
  reason: SupplierReturnReason;
};

export type StockAuditStatus = 'Open' | 'InProgress' | 'Completed';

export type StockAudit = {
  id: string;
  auditNumber: string;
  branchId: string;
  branch?: Branch;
  status: StockAuditStatus;
  auditDate: string;
  completedAt?: string;
  notes?: string;
  items: StockAuditItem[];
};

export type StockAuditItem = {
  id: string;
  itemId: string;
  item?: InventoryItem;
  systemQty: number;
  physicalQty?: number;
  discrepancy?: number;
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
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'hadir' | 'terlambat' | 'izin' | 'sakit';
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
  payDay: number;
  thrMonth?: number;
  thrMinWorkMonths: number;
  thrMultiplier: number;
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

export type ServiceReceiptSettings = {
  paperWidth: '58mm' | '80mm' | '58mm-on-80mm';
  // Tanda Terima (saat unit masuk)
  showIntakeCustomerPhone: boolean;
  showIntakeDeviceSerial: boolean;
  showIntakeEstimatedCost: boolean;
  showIntakePickupCode: boolean;
  intakeFooter: string;
  // Nota Selesai (invoice)
  showInvoiceSpareparts: boolean;
  showInvoiceServiceFee: boolean;
  showInvoiceWarranty: boolean;
  showInvoiceTechnician: boolean;
  invoiceFooter: string;
};
