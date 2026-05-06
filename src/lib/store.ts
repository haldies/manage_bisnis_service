import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  User, Branch, InventoryItem, Stock, ServiceTicket, 
  Supplier, PurchaseOrder, GoodsReceipt, StockOut, SupplierReturn, StockAudit,
  StockTransfer, FinanceLog,
  Transaction, CartItem, PaymentMethod, StoreProfile, ReceiptSettings, ServiceReceiptSettings,
  Shift, CashAdvance, LeaveRequest, ModuleName, Role, Category, AccessLevel, Attendance, DeviceModel, ServiceType,
  InventoryUnit, StockTransferStatus, BonusPool
} from './types';


export function getUserAccessLevel(
  user: User | null,
  module: ModuleName,
  rolePermissions: Record<string, Record<ModuleName, AccessLevel>>
): AccessLevel {
  if (!user) return 'None';
  if (user.role?.name === 'Owner') return 'Full';

  // 1. Store rolePermissions (populated after fetchRoles)
  const storePerms = rolePermissions[user.role?.name || ''];
  if (storePerms?.[module]) return storePerms[module];

  // 2. Granular permissions on the user object (from login API response)
  const rolePerm = (user.role as any)?.permissions;
  if (Array.isArray(rolePerm)) {
    const p = rolePerm.find((p: any) => p.module === module);
    if (p) {
      if (p.canCreate || p.canUpdate || p.canDelete) return 'Full';
      if (p.canRead) return 'Read';
    }
  }

  return 'None';
}

/**
 * Returns true if the user has at least the required access level for a module.
 */
export function hasModuleAccess(
  user: User | null,
  module: ModuleName,
  requiredLevel: AccessLevel,
  rolePermissions: Record<string, Record<ModuleName, AccessLevel>>
): boolean {
  const levels: AccessLevel[] = ['None', 'Read', 'Full'];
  const userLevel = getUserAccessLevel(user, module, rolePermissions);
  return levels.indexOf(userLevel) >= levels.indexOf(requiredLevel);
}


export type Product = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  image?: string;
  category: string;
  stock: number;
  sku?: string;
  unit?: string;
  warranty?: string;
};

export type PrinterConfig = {
  id: string;
  nama: string;
  address: string;
  tipe: string;
  terhubung: boolean;
};

// Removed StoreProfile and ReceiptSettings (moved to types.ts)

interface PosState {
  currentUser: User | null;
  currentBranch: Branch | null;
  
  // ERP State
  users: User[];
  branches: Branch[];
  inventory: InventoryItem[];
  stocks: Stock[];
  services: ServiceTicket[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  stockOuts: StockOut[];
  supplierReturns: SupplierReturn[];
  stockAudits: StockAudit[];
  financeLogs: FinanceLog[];
  stockTransfers: StockTransfer[];
  inventoryUnits: InventoryUnit[];
  shifts: Shift[];



  cashAdvances: CashAdvance[];
  leaveRequests: LeaveRequest[];
  overtimes: any[];
  roles: Role[];
  rolePermissions: Record<string, Record<ModuleName, AccessLevel>>;
  attendances: Attendance[];
  bonusPools: BonusPool[];

  // POS State
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  transactions: Transaction[];
  storeProfile: StoreProfile;
  serviceTypes: ServiceType[];
  deviceModels: DeviceModel[];
  selectedPrinter: PrinterConfig | null;

  receiptSettings: ReceiptSettings;
  serviceReceiptSettings: ServiceReceiptSettings;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  lastFetched: number | null;



  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setBranch: (branchId: string | null) => void;
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<void>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  removeBranch: (id: string) => Promise<void>;
  fetchBonusPools: () => Promise<void>;
  addBonusPool: (pool: Omit<BonusPool, 'id'>) => Promise<void>;
  removeBonusPool: (id: string) => Promise<void>;
  
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;

  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  setCartItemTechnician: (productId: string, technicianId: string) => void;
  clearCart: () => void;

  checkout: (paymentMethod: Transaction['paymentMethod'], amountPaid: number, customerData?: { name: string, phone: string, address: string }) => Promise<Transaction>;
  
  updatePrinterConfig: (config: PrinterConfig | null) => void;
  updateReceiptSettings: (settings: Partial<ReceiptSettings>) => void;
  updateServiceReceiptSettings: (settings: Partial<ServiceReceiptSettings>) => void;
  
  updateStoreProfile: (updates: Partial<StoreProfile>) => void;
  resetAllData: () => void;
  fetchInitialData: () => Promise<void>;
  addAttendance: (attendance: Omit<Attendance, 'id' | 'createdAt'>) => Promise<void>;
  fetchAttendances: (employeeId?: string, date?: string) => Promise<void>;
  updateAttendance: (attendanceId: string, updates: any) => Promise<void>;

  // Module Actions
  addServiceTicket: (ticket: Omit<ServiceTicket, 'id'>) => Promise<string>;
  updateServiceTicket: (id: string, updates: Partial<ServiceTicket>) => Promise<void>;
  deleteServiceTicket: (id: string) => Promise<void>;
  
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<string>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  addShift: (shift: Omit<Shift, 'id'>) => Promise<void>;
  
  // Stock Transfer Actions
  createStockTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateStockTransferStatus: (id: string, status: StockTransferStatus) => Promise<void>;
  fetchTransfers: () => Promise<void>;

  // Inventory Unit Actions
  addInventoryUnit: (unit: Omit<InventoryUnit, 'id' | 'entryDate'>) => Promise<void>;
  deleteInventoryUnit: (id: string) => Promise<void>;

  deleteShift: (id: string) => Promise<void>;

  addStock: (stock: Omit<Stock, 'id'>) => Promise<void>;
  updateStock: (itemId: string, branchId: string, quantity: number) => Promise<void>;
  
  addProduct: (item: Omit<InventoryItem, 'id'>) => Promise<string>;
  deleteProduct: (id: string) => Promise<void>;
  
  addCashAdvance: (advance: any) => Promise<void>;
  updateCashAdvance: (id: string, updates: any) => Promise<void>;
  addLeaveRequest: (request: any) => Promise<void>;
  updateLeaveRequest: (id: string, updates: any) => Promise<void>;
  addOvertime: (overtime: any) => Promise<void>;
  updateOvertime: (id: string, updates: any) => Promise<void>;
  updateRolePermission: (roleName: string, module: ModuleName, level: AccessLevel) => Promise<void>;
  addRole: (role: string) => Promise<void>;
  deleteRole: (role: string) => Promise<void>;
  renameRole: (oldRole: string, newRole: string) => Promise<void>;
  resetRoles: (force?: boolean) => Promise<void>;
  
  addServiceType: (type: Omit<ServiceType, 'id'>) => Promise<void>;
  updateServiceType: (id: string, updates: Partial<ServiceType>) => Promise<void>;
  deleteServiceType: (id: string) => Promise<void>;

  fetchRoles: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchServices: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchBranches: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchStaffOperasional: () => Promise<void>;

  // Supplier Actions
  fetchSuppliers: () => Promise<void>;
  addSupplier: (s: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Purchase Order Actions
  fetchPurchaseOrders: () => Promise<void>;
  createPurchaseOrder: (po: { supplierId: string; branchId: string; expectedDate?: string; notes?: string; items: { itemId: string; quantity: number; unitPrice: number }[] }) => Promise<string>;
  sendPurchaseOrder: (id: string) => Promise<void>;
  cancelPurchaseOrder: (id: string) => Promise<void>;

  // Goods Receipt Actions
  fetchGoodsReceipts: () => Promise<void>;
  createGoodsReceipt: (gr: { poId: string; branchId: string; receiptDate?: string; notes?: string; items: { itemId: string; quantity: number; unitPrice: number }[] }) => Promise<void>;

  // Stock Out Actions
  fetchStockOuts: () => Promise<void>;
  createStockOut: (so: { branchId: string; type: import('./types').StockOutType; date?: string; reason: string; notes?: string; items: { itemId: string; quantity: number }[] }) => Promise<void>;

  // Supplier Return Actions
  fetchSupplierReturns: () => Promise<void>;
  createSupplierReturn: (sr: { supplierId: string; branchId: string; grId?: string; returnDate?: string; notes?: string; items: { itemId: string; quantity: number; reason: import('./types').SupplierReturnReason }[] }) => Promise<string>;
  sendSupplierReturn: (id: string) => Promise<void>;

  // Stock Audit Actions
  fetchStockAudits: () => Promise<void>;
  createStockAudit: (branchId: string, notes?: string) => Promise<string>;
  updateStockAuditItems: (auditId: string, items: { id: string; physicalQty: number }[]) => Promise<void>;
  applyStockAudit: (auditId: string) => Promise<void>;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      // Initial Values
      products: [],
      categories: [],
      cart: [],
      transactions: [],
      attendances: [],
      bonusPools: [],
      storeProfile: {
        name: 'Kasirai POS',
        address: 'Jl. Raya No. 123',
        phone: '081234567890',
        taxPercentage: 11,
        enableTax: false,
        serviceIncentivePercentage: 10,
        startTime: '09:00',
        endTime: '18:00',
        baseSalary: 0,
        attendanceRate: 0,
        latePenalty: 0,
        absentPenalty: 0,
        overtimeRate: 0,
        totalWorkDays: 26,
        serviceIncentive: 10,
        payDay: 1,
        thrMonth: undefined,
        thrMinWorkMonths: 12,
        thrMultiplier: 1.0,
      },
      selectedPrinter: null,
      receiptSettings: {
        paperWidth: '58mm',
        showQueueNumber: true,
        showStoreAddress: true,
        showStorePhone: true,
        showCustomerName: true,
        showCashierName: true,
        showTax: true,
        showDiscount: true,
        receiptFooter: 'Terima Kasih!\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.',
      },
      serviceReceiptSettings: {
        paperWidth: '58mm',
        showIntakeCustomerPhone: true,
        showIntakeDeviceSerial: true,
        showIntakeEstimatedCost: false,
        showIntakePickupCode: true,
        intakeFooter: 'Simpan struk ini untuk pengambilan unit.',
        showInvoiceSpareparts: true,
        showInvoiceServiceFee: true,
        showInvoiceWarranty: true,
        showInvoiceTechnician: true,
        invoiceFooter: 'Terima kasih atas kepercayaan Anda!\nGaransi berlaku sesuai ketentuan.',
      },
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      lastFetched: null,



      currentUser: null,
      currentBranch: null,
      users: [],
      branches: [],
      inventory: [],
      stocks: [],
      services: [],
      suppliers: [],
      purchaseOrders: [],
      goodsReceipts: [],
      stockOuts: [],
      supplierReturns: [],
      stockAudits: [],
      financeLogs: [],
      shifts: [],
      stockTransfers: [],
      inventoryUnits: [],
      cashAdvances: [],
      leaveRequests: [],
      overtimes: [],
      serviceTypes: [],
      deviceModels: [],
      roles: [],
      rolePermissions: {
        'Owner':  { 'Dashboard': 'Full', 'POS': 'Full', 'Service': 'Full', 'Inventory': 'Full', 'Finance': 'Full', 'Staff': 'Full', 'Transactions': 'Full', 'Settings': 'Full' },
        'Admin':  { 'Dashboard': 'Full', 'POS': 'Full', 'Service': 'Full', 'Inventory': 'Full', 'Finance': 'Read', 'Staff': 'Full', 'Transactions': 'Full', 'Settings': 'Full' },
        'Cashier': { 'Dashboard': 'Read', 'POS': 'Full', 'Service': 'Read', 'Inventory': 'Read', 'Finance': 'None', 'Staff': 'None', 'Transactions': 'Read', 'Settings': 'Full' },
        'Technician': { 'Dashboard': 'Read', 'POS': 'None', 'Service': 'Full', 'Inventory': 'Read', 'Finance': 'None', 'Staff': 'None', 'Transactions': 'Read', 'Settings': 'None' }
      },

      // --- GENERAL ACTIONS ---
      fetchInitialData: async () => {
        const { 
          fetchUsers, fetchBranches, fetchInventory, fetchServices, 
          fetchTransactions, fetchSettings, fetchStaffOperasional, fetchAttendances
        } = get();
        
        const { lastFetched } = get();
        const now = Date.now();
        if (lastFetched && now - lastFetched < 30000) return;

        try {
          // Fetch everything in parallel
          await Promise.all([
            get().fetchRoles(),
            fetchUsers(),
            fetchBranches(),
            fetchInventory(),
            fetchServices(),
            fetchTransactions(),
            fetchSettings(),
            fetchStaffOperasional(),
            fetchAttendances(),
            get().fetchBonusPools()
          ]);
          set({ lastFetched: now });
        } catch (error) {
          console.error("Failed to fetch initial data", error);
        }
      },
      fetchRoles: async () => {
        try {
          const res = await fetch('/api/roles');
          if (res.ok) {
            const data = await res.json();
            set({ roles: data });

            // Build rolePermissions from DB data so any role (Cashier, Technician, etc.)
            // is automatically registered — no more hardcoded role names needed.
            const MODULES: ModuleName[] = ['Dashboard', 'POS', 'Service', 'Inventory', 'Finance', 'Staff', 'Transactions', 'Settings'];
            const built: Record<string, Record<ModuleName, AccessLevel>> = {};

            for (const role of data) {
              const perms: Record<ModuleName, AccessLevel> = {} as any;
              for (const mod of MODULES) {
                const p = role.permissions?.find((p: any) => p.module === mod);
                if (!p) {
                  perms[mod] = 'None';
                } else if (p.canCreate || p.canUpdate || p.canDelete) {
                  perms[mod] = 'Full';
                } else if (p.canRead) {
                  perms[mod] = 'Read';
                } else {
                  perms[mod] = 'None';
                }
              }
              built[role.name] = perms;
            }

            // Merge: DB roles take priority, keep hardcoded defaults as fallback
            // for roles that exist in store but not yet in DB
            set((state) => ({
              rolePermissions: { ...state.rolePermissions, ...built }
            }));
          }
        } catch (error) {
          console.error("Failed to fetch roles", error);
        }
      },
      fetchUsers: async () => {
        try {
          const res = await fetch('/api/users');
          if (res.ok) {
            const data = await res.json();
            set({ users: data });
          }
        } catch (error) {
          console.error("Failed to fetch users", error);
        }
      },

      fetchBranches: async () => {
        try {
          const res = await fetch('/api/branches');
          if (res.ok) {
            const data = await res.json();
            set({ branches: data });
          }
        } catch (error) {
          console.error("Failed to fetch branches", error);
        }
      },

      fetchInventory: async () => {
        try {
          const res = await fetch('/api/inventory');
          const catRes = await fetch('/api/categories');
          if (res.ok && catRes.ok) {
            const data = await res.json();
            const categories = await catRes.json();
            set({ 
              inventory: data, 
              categories: categories,
              stocks: data.flatMap((item: any) => item.stocks || [])
            });
          }
        } catch (error) {
          console.error("Failed to fetch inventory", error);
        }
      },

      fetchServices: async () => {
        try {
          const [res, typeRes, deviceRes] = await Promise.all([
            fetch('/api/services'),
            fetch('/api/services/types'),
            fetch('/api/device-models'),
          ]);
          if (res.ok) {
            const data = await res.json();
            set({ services: data });
          }
          if (typeRes.ok) {
            const types = await typeRes.json();
            set({
              serviceTypes: types.map((t: any) => ({
                ...t,
                price: parseFloat(String(t.price)) || 0,
                feeValue: parseFloat(String(t.feeValue)) || 0,
                incentiveValue: parseFloat(String(t.incentiveValue)) || 0,
              }))
            });
          }
          if (deviceRes.ok) {
            const models = await deviceRes.json();
            set({ deviceModels: models });
          }
        } catch (error) {
          console.error("Failed to fetch services", error);
        }
      },

      fetchTransactions: async () => {
        try {
          const res = await fetch('/api/transactions');
          if (res.ok) {
            const data = await res.json();
            set({ transactions: data });
          }
        } catch (error) {
          console.error("Failed to fetch transactions", error);
        }
      },

      fetchSettings: async () => {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            set({ storeProfile: data });
          }
        } catch (error) {
          console.error("Failed to fetch settings", error);
        }
      },

      fetchStaffOperasional: async () => {
        try {
          const [advRes, leaveRes, otRes] = await Promise.all([
            fetch('/api/staff/cash-advance'),
            fetch('/api/staff/leave'),
            fetch('/api/staff/overtime')
          ]);
          
          if (advRes.ok) {
            const advances = await advRes.json();
            set({ cashAdvances: advances });
          }
          if (leaveRes.ok) {
            const leaves = await leaveRes.json();
            set({ leaveRequests: leaves });
          }
          if (otRes.ok) {
            const overtimes = await otRes.json();
            set({ overtimes: overtimes });
          }
        } catch (error) {
          console.error("Failed to fetch operational data", error);
        }
      },


      login: async (username: string, password: string) => {

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          if (res.ok) {
            const data = await res.json();
            
            // Auto-select branch if user has one assigned
            const branch = data.user.branchId 
              ? get().branches.find(b => b.id === data.user.branchId) || null 
              : null;
            
            // Reset lastFetched so _app.tsx triggers a fresh fetchInitialData after login
            set({ currentUser: data.user, currentBranch: branch, lastFetched: null });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Login error", error);
          return false;
        }
      },

      logout: () => set({ currentUser: null, currentBranch: null, lastFetched: null }),

      setBranch: (branchId: string | null) => {

        const branch = get().branches.find(b => b.id === branchId) || null;
        set({ currentBranch: branch });
      },

      updateBranch: async (id: string, updates: any) => {

        try {
          const res = await fetch(`/api/branches/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.details || "Update branch failed");
          }
          const updated = await res.json();
          console.log("Branch updated successfully:", updated);
          set((state) => ({
            branches: state.branches.map(b => b.id === id ? { ...b, ...updated } : b),
            currentBranch: state.currentBranch?.id === id ? { ...state.currentBranch, ...updated } : state.currentBranch
          }));
        } catch (error) {
          console.error("Error updating branch:", error);
          throw error;
        }
      },

      // --- CART ACTIONS ---
      addToCart: (product: any) => set((state: PosState) => {

        const existing = state.cart.find(item => item.id === product.id);
        if (existing) {
          return {
            cart: state.cart.map(item =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            )
          };
        }
        return { cart: [...state.cart, { ...product, quantity: 1 }] };
      }),

      removeFromCart: (productId: string) => set((state: PosState) => ({

        cart: state.cart.filter(item => item.id !== productId)
      })),

      updateCartQuantity: (productId: string, quantity: number) => set((state: PosState) => ({

        cart: quantity <= 0 
          ? state.cart.filter(item => item.id !== productId)
          : state.cart.map(item => item.id === productId ? { ...item, quantity } : item)
      })),

      setCartItemTechnician: (productId: string, technicianId: string) => set((state: PosState) => ({

        cart: state.cart.map(item => item.id === productId ? { ...item, technicianId } : item)
      })),

      clearCart: () => set({ cart: [] }),

      // --- TRANSACTION ACTIONS ---
      checkout: async (paymentMethod: PaymentMethod, amountPaid: number, customerData: any) => {

        const { cart, storeProfile, stocks, currentBranch, branches, currentUser, transactions } = get();
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = storeProfile.enableTax ? Math.round((subtotal * storeProfile.taxPercentage) / 100) : 0;
        const total = subtotal + tax;

        const payload = {
          branchId: currentBranch?.id || branches[0]?.id || 'b1',
          cashierId: currentUser?.id || 'system',
          source: 'Retail',
          items: [...cart],
          total,
          paymentMethod,
          amountPaid,
          change: amountPaid - total,
          status: 'Paid',
          tax,
          discount: 0,
          customerName: customerData?.name,
          customerPhone: customerData?.phone,
          customerAddress: customerData?.address
        };

        try {
          const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error("Checkout failed");
          const transaction = await res.json();
          
          // Local update for stock (optimistic)
          const updatedStocks = stocks.map(s => {
            const cartItem = cart.find(item => item.id === s.itemId && s.branchId === payload.branchId);
            return cartItem ? { ...s, quantity: Math.max(0, s.quantity - cartItem.quantity) } : s;
          });

          set({
            transactions: [transaction, ...transactions],
            stocks: updatedStocks,
            cart: [],
          });
          return transaction;
        } catch (error) {
          console.error("Checkout error:", error);
          throw error;
        }
      },

      updateTransaction: async (id: string, updates: Partial<Transaction>) => {

        try {
          const res = await fetch(`/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Update failed");
          const updated = await res.json();
          set((state) => ({
            transactions: state.transactions.map(t => t.id === id ? { ...t, ...updated } : t)
          }));
        } catch (error) {
          console.error("Error updating transaction:", error);
          throw error;
        }
      },

      deleteTransaction: async (id: string) => {

        try {
          const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Delete failed");
          set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) }));
        } catch (error) {
          console.error("Error deleting transaction:", error);
          throw error;
        }
      },

      // --- INVENTORY ACTIONS ---
      addInventoryItem: async (item: Omit<InventoryItem, 'id'>) => {

        try {
          const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Add item failed");
          }
          const newItem = await res.json();
          set((state) => ({
            inventory: [...state.inventory, newItem],
            stocks: [...state.stocks, ...(newItem.stocks || [])]
          }));
          return newItem.id;
        } catch (error) {
          console.error("Error adding item:", error);
          throw error;
        }
      },

      updateInventoryItem: async (id: string, updates: Partial<InventoryItem>) => {

        try {
          const res = await fetch(`/api/inventory/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Update failed");
          const updated = await res.json();
          set((state) => ({
            inventory: state.inventory.map(i => i.id === id ? { ...i, ...updated } : i)
          }));
        } catch (error) {
          console.error("Error updating item:", error);
          throw error;
        }
      },

      deleteInventoryItem: async (id: string) => {

        try {
          const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Delete failed");
          set((state) => ({
            inventory: state.inventory.filter(i => i.id !== id),
            stocks: state.stocks.filter(s => s.itemId !== id)
          }));
        } catch (error) {
          console.error("Error deleting item:", error);
          throw error;
        }
      },

      // --- SERVICE ACTIONS ---
      addServiceTicket: async (ticket: Omit<ServiceTicket, 'id'>) => {

        try {
          const res = await fetch('/api/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticket)
          });
          if (!res.ok) throw new Error("Add service failed");
          const newTicket = await res.json();
          set((state) => ({ services: [newTicket, ...state.services] }));
          return newTicket.id;
        } catch (error) {
          console.error("Error adding service:", error);
          throw error;
        }
      },

      updateServiceTicket: async (id: string, updates: Partial<ServiceTicket>) => {

        try {
          const res = await fetch(`/api/services/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Update service failed");
          const updated = await res.json();
          set((state) => ({
            services: state.services.map(s => s.id === id ? { ...s, ...updated } : s)
          }));
        } catch (error) {
          console.error("Error updating service:", error);
          throw error;
        }
      },

      deleteServiceTicket: async (id: string) => {

        try {
          const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Delete service failed");
          set((state) => ({ services: state.services.filter(s => s.id !== id) }));
        } catch (error) {
          console.error("Error deleting service:", error);
          throw error;
        }
      },

      // --- STAFF ACTIONS ---
      addUser: async (user: Omit<User, 'id'>) => {

        try {
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
          });
          if (!res.ok) throw new Error("Add user failed");
          const newUser = await res.json();
          set((state) => ({ users: [...state.users, newUser] }));
        } catch (error) {
          console.error("Error adding user:", error);
          throw error;
        }
      },

      updateUser: async (id: string, updates: Partial<User>) => {

        try {
          const res = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Update user failed");
          const updated = await res.json();
          set((state) => ({
            users: state.users.map(u => u.id === id ? { ...u, ...updated } : u),
            currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...updated } : state.currentUser
          }));
        } catch (error) {
          console.error("Error updating user:", error);
          throw error;
        }
      },

      removeUser: async (id: string) => {

        try {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Delete user failed");
          set((state) => ({ users: state.users.filter(u => u.id !== id) }));
        } catch (error) {
          console.error("Error deleting user:", error);
          throw error;
        }
      },

      // --- SHIFT ACTIONS ---
      addShift: async (shift: Omit<Shift, 'id'>) => {

        try {
          const res = await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shift)
          });
          if (!res.ok) throw new Error("Add shift failed");
          const newShift = await res.json();
          set((state) => ({ shifts: [...state.shifts, newShift] }));
        } catch (error) {
          console.error("Error adding shift:", error);
          throw error;
        }
      },

      updateShift: async (id: string, updates: Partial<Shift>) => {

        // Implementation
      },

      deleteShift: async (id: string) => {

        // Implementation
      },

      createStockTransfer: async (transfer) => {
        try {
          const res = await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transfer)
          });
          if (res.ok) {
            const newTransfer = await res.json();
            set((state) => ({ stockTransfers: [newTransfer, ...state.stockTransfers] }));
          }
        } catch (error) {
          console.error("Failed to create transfer", error);
        }
      },

      fetchTransfers: async () => {
        try {
          // Add timestamp to prevent caching and force fresh data
          const res = await fetch(`/api/transfers?t=${Date.now()}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          if (res.ok) {
            const data = await res.json();
            set({ stockTransfers: data });
          }
        } catch (error) {
          console.error("Failed to fetch transfers:", error);
        }
      },

      addInventoryUnit: async (unit: any) => {

        try {
          const res = await fetch('/api/inventory/units', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(unit)
          });
          if (res.ok) {
            const newUnit = await res.json();
            set((state: PosState) => ({ inventoryUnits: [newUnit, ...state.inventoryUnits] }));

          }
        } catch (error) {
          console.error("Failed to add inventory unit", error);
        }
      },

      deleteInventoryUnit: async (id: string) => {

        try {
          const res = await fetch(`/api/inventory/units/${id}`, { method: 'DELETE' });
          if (res.ok) {
            set((state: PosState) => ({ inventoryUnits: state.inventoryUnits.filter(u => u.id !== id) }));

          }
        } catch (error) {
          console.error("Failed to delete inventory unit", error);
        }
      },

      updateStockTransferStatus: async (id: string, status: StockTransferStatus) => {


        try {
          const res = await fetch(`/api/transfers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          if (res.ok) {
            const updated = await res.json();
            set((state: PosState) => {

              const newTransfers = state.stockTransfers.map(t => t.id === id ? updated : t);
              
              // If completed, we also need to refresh stocks since movement happened
              // We could manually update local stock state or just re-fetch
              return { stockTransfers: newTransfers };
            });
            
            if (status === 'Completed') {
              // Forced re-fetch of everything to ensure stocks are in sync
              const { fetchInitialData } = get();
              // Reset lastFetched to force fresh data
              set({ lastFetched: null });
              await fetchInitialData();
            }
          }
        } catch (error) {
          console.error("Failed to update transfer status", error);
        }
      },

      // --- OTHER ACTIONS ---
      addOvertime: async (overtime) => {
        try {
          const res = await fetch('/api/staff/overtime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overtime)
          });
          const saved = await res.json();
          set((state) => ({ overtimes: [...state.overtimes, saved] }));
        } catch (error) {
          console.error("Error adding overtime:", error);
        }
      },

      updateOvertime: async (id, updates) => {
        try {
          const res = await fetch('/api/staff/overtime', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates })
          });
          const saved = await res.json();
          set((state) => ({ 
            overtimes: state.overtimes.map(o => o.id === id ? saved : o) 
          }));
        } catch (error) {
          console.error("Error updating overtime:", error);
        }
      },

      updateRolePermission: async (roleName: string, module: ModuleName, level: AccessLevel) => {
        // Optimistic local update
        set((state) => ({
          rolePermissions: {
            ...state.rolePermissions,
            [roleName]: {
              ...(state.rolePermissions[roleName] || {}),
              [module]: level
            }
          }
        }));

        // Persist to DB
        try {
          const role = get().roles.find((r: any) => r.name === roleName);
          if (!role) return;
          await fetch(`/api/roles/${role.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions: [{ module, level }] }),
          });
        } catch (error) {
          console.error('Error saving permission to DB:', error);
        }
      },

      addRole: async (roleName: string) => {
        try {
          const res = await fetch('/api/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: roleName }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to create role');
          }
          const newRole = await res.json();
          // Add to roles list and build empty rolePermissions entry
          set((state) => ({
            roles: [...state.roles, newRole],
            rolePermissions: {
              ...state.rolePermissions,
              [roleName]: {
                'Dashboard': 'None', 'POS': 'None', 'Service': 'None', 'Inventory': 'None',
                'Finance': 'None', 'Staff': 'None', 'Transactions': 'None', 'Settings': 'None'
              }
            }
          }));
        } catch (error) {
          console.error('Error adding role:', error);
          throw error;
        }
      },

      deleteRole: async (roleName: string) => {
        try {
          const role = get().roles.find((r: any) => r.name === roleName);
          if (!role) return;
          const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to delete role');
          }
          set((state) => {
            const { [roleName]: deleted, ...rest } = state.rolePermissions;
            return {
              roles: state.roles.filter((r: any) => r.id !== role.id),
              rolePermissions: rest,
            };
          });
        } catch (error) {
          console.error('Error deleting role:', error);
          throw error;
        }
      },

      renameRole: async (oldName: string, newName: string) => {
        // Optimistic local update
        set((state) => {
          const permissions = state.rolePermissions[oldName];
          if (!permissions) return state;
          const { [oldName]: removed, ...rest } = state.rolePermissions;
          return {
            roles: state.roles.map((r: any) => r.name === oldName ? { ...r, name: newName } : r),
            rolePermissions: { ...rest, [newName]: permissions },
          };
        });

        // Persist to DB
        try {
          const role = get().roles.find((r: any) => r.name === newName); // already renamed in state
          if (!role) return;
          await fetch(`/api/roles/${role.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
          });
        } catch (error) {
          console.error('Error renaming role in DB:', error);
        }
      },

      resetRoles: async (force = false) => {
        const url = force ? '/api/roles/reset?force=true' : '/api/roles/reset';
        const res = await fetch(url, { method: 'POST' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to reset roles');
        }
        const { roles } = await res.json();

        // Rebuild rolePermissions from fresh data
        const MODULES: ModuleName[] = ['Dashboard', 'POS', 'Service', 'Inventory', 'Finance', 'Staff', 'Transactions', 'Settings'];
        const built: Record<string, Record<ModuleName, AccessLevel>> = {};
        for (const role of roles) {
          const perms: Record<ModuleName, AccessLevel> = {} as any;
          for (const mod of MODULES) {
            const p = role.permissions?.find((p: any) => p.module === mod);
            if (!p) { perms[mod] = 'None'; }
            else if (p.canCreate || p.canUpdate || p.canDelete) { perms[mod] = 'Full'; }
            else if (p.canRead) { perms[mod] = 'Read'; }
            else { perms[mod] = 'None'; }
          }
          built[role.name] = perms;
        }
        set({ roles, rolePermissions: built });
      },

      addStock: async (stock) => {
        try {
          const res = await fetch('/api/inventory/stocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stock)
          });
          if (!res.ok) throw new Error("Add stock failed");
          const newStock = await res.json();
          set((state) => ({ stocks: [...state.stocks, newStock] }));
        } catch (error) {
          console.error("Error adding stock:", error);
          throw error;
        }
      },

      updateStock: async (itemId, branchId, quantity) => {
        try {
          const res = await fetch(`/api/inventory/stocks/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, branchId, quantity })
          });
          if (!res.ok) throw new Error("Update stock failed");
          const updated = await res.json();
          set((state) => ({
            stocks: state.stocks.map(s => (s.itemId === itemId && s.branchId === branchId) ? { ...s, ...updated } : s)
          }));
        } catch (error) {
          console.error("Error updating stock:", error);
          throw error;
        }
      },

      addProduct: async (item) => {
        const { addInventoryItem } = get();
        return addInventoryItem(item);
      },

      deleteProduct: async (id) => {
        const { deleteInventoryItem } = get();
        return deleteInventoryItem(id);
      },

      addCashAdvance: async (advance) => {
        try {
          const res = await fetch('/api/staff/cash-advance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(advance)
          });
          if (!res.ok) throw new Error("Add cash advance failed");
          const newAdvance = await res.json();
          set((state) => ({ cashAdvances: [...state.cashAdvances, newAdvance] }));
        } catch (error) {
          console.error("Error adding cash advance:", error);
          throw error;
        }
      },

      updateCashAdvance: async (id, updates) => {
        try {
          const res = await fetch(`/api/staff/cash-advance/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Update cash advance failed");
          const updated = await res.json();
          set((state) => ({
            cashAdvances: state.cashAdvances.map(c => c.id === id ? updated : c)
          }));
        } catch (error) {
          console.error("Error updating cash advance:", error);
          throw error;
        }
      },

      addLeaveRequest: async (request) => {
        try {
          const res = await fetch('/api/staff/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
          });
          if (!res.ok) throw new Error("Add leave request failed");
          const newRequest = await res.json();
          set((state) => ({ leaveRequests: [...state.leaveRequests, newRequest] }));
        } catch (error) {
          console.error("Error adding leave request:", error);
          throw error;
        }
      },

      updateLeaveRequest: async (id, updates) => {
        try {
          const res = await fetch(`/api/staff/leave/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Update leave request failed");
          const updated = await res.json();
          set((state) => ({
            leaveRequests: state.leaveRequests.map(l => l.id === id ? updated : l)
          }));
        } catch (error) {
          console.error("Error updating leave request:", error);
          throw error;
        }
      },

      fetchBonusPools: async () => {
        try {
          const res = await fetch('/api/staff/bonus-pools');
          if (res.ok) {
            const pools = await res.json();
            set({ bonusPools: pools });
          }
        } catch (error) {
          console.error("Error fetching bonus pools:", error);
        }
      },

      addBonusPool: async (pool) => {
        try {
          const res = await fetch('/api/staff/bonus-pools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pool)
          });
          if (!res.ok) throw new Error("Add bonus pool failed");
          const newPool = await res.json();
          set((state) => ({ bonusPools: [...state.bonusPools, newPool] }));
        } catch (error) {
          console.error("Error adding bonus pool:", error);
          // Fallback for demo if API doesn't exist yet
          const fallbackPool = { ...pool, id: Math.random().toString(36).substr(2, 9) } as any;
          set((state) => ({ bonusPools: [...state.bonusPools, fallbackPool] }));
        }
      },

      removeBonusPool: async (id) => {
        try {
          const res = await fetch(`/api/staff/bonus-pools/${id}`, { method: 'DELETE' });
          if (res.ok) {
            set((state) => ({ bonusPools: state.bonusPools.filter(p => p.id !== id) }));
          }
        } catch (error) {
          console.error("Error removing bonus pool:", error);
          // Local fallback
          set((state) => ({ bonusPools: state.bonusPools.filter(p => p.id !== id) }));
        }
      },

      addCategory: async (name) => {
        try {
          const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          });
          if (!res.ok) throw new Error("Add category failed");
          const newCat = await res.json();
          set((state) => ({ categories: [...state.categories, newCat] }));
        } catch (error) {
          console.error("Error adding category:", error);
          throw error;
        }
      },

      deleteCategory: async (id) => {
        try {
          const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Delete category failed");
          set((state) => ({ categories: state.categories.filter(c => c.id !== id) }));
        } catch (error) {
          console.error("Error deleting category:", error);
          throw error;
        }
      },

      updatePrinterConfig: (config) => set({ selectedPrinter: config }),
      updateReceiptSettings: (settings) => set((state) => ({
        receiptSettings: { ...state.receiptSettings, ...settings }
      })),
      updateServiceReceiptSettings: (settings) => set((state) => ({
        serviceReceiptSettings: { ...state.serviceReceiptSettings, ...settings }
      })),
      
      updateStoreProfile: async (updates) => {
        const current = get().storeProfile;
        const merged = { ...current, ...updates };
        
        // Optimistic update
        set({ storeProfile: merged });

        // Debounce logic could go here, but for now let's just make it safer
        try {
          const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged)
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || "Failed to save settings to database");
          }
          
          const saved = await res.json();
          // Only update if the current state is still what we saved (basic race condition protection)
          // Actually, just update it to be sure we have the DB state
          set({ storeProfile: saved });
        } catch (error: any) {
          console.error("Error updating store profile:", error);
          // Optional: You could show a toast here if a toast library was available
        }
      },
      resetAllData: () => set({ cart: [], transactions: [] }),

      addAttendance: async (attendance) => {
        try {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attendance)
          });
          if (!res.ok) throw new Error("Clock in failed");
          const { data: newRecord } = await res.json();
          set((state) => ({ attendances: [newRecord, ...state.attendances] }));
        } catch (error) {
          console.error("Error adding attendance:", error);
          throw error;
        }
      },

      fetchAttendances: async (employeeId, date) => {
        try {
          let url = '/api/attendance';
          const params = new URLSearchParams();
          if (employeeId) params.append('employeeId', employeeId);
          if (date) params.append('date', date);
          if (params.toString()) url += `?${params.toString()}`;

          const res = await fetch(url);
          if (!res.ok) throw new Error("Fetch attendance failed");
          const { data } = await res.json();
          set({ attendances: data });
        } catch (error) {
          console.error("Error fetching attendance:", error);
        }
      },

      updateAttendance: async (attendanceId, updates) => {
        try {
          const res = await fetch('/api/attendance', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendanceId, ...updates })
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Check-out failed");
          }
          const { data: updatedRecord } = await res.json();
          set((state) => ({ 
            attendances: state.attendances.map(a => a.id === attendanceId ? updatedRecord : a) 
          }));
        } catch (error) {
          console.error("Error updating attendance:", error);
          throw error;
        }
      },
      
      addBranch: async (branch) => {
        try {
          const res = await fetch('/api/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(branch)
          });
          if (!res.ok) throw new Error("Add branch failed");
          const newBranch = await res.json();
          set((state) => ({ branches: [...state.branches, newBranch] }));
        } catch (error) {
          console.error("Error adding branch:", error);
          throw error;
        }
      },

      removeBranch: async (id) => {
        try {
          const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Delete branch failed");
          set((state) => ({ branches: state.branches.filter(b => b.id !== id) }));
        } catch (error) {
          console.error("Error deleting branch:", error);
          throw error;
        }
      },

      // --- SERVICE TYPE ACTIONS ---
      addServiceType: async (type) => {
        try {
          const res = await fetch('/api/services/types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(type)
          });
          if (!res.ok) throw new Error("Add service type failed");
          const newType = await res.json();
          set((state) => ({ serviceTypes: [...state.serviceTypes, newType] }));
        } catch (error) {
          console.error("Error adding service type:", error);
          throw error;
        }
      },

      updateServiceType: async (id, updates) => {
        try {
          const res = await fetch(`/api/services/types/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Update service type failed");
          const updated = await res.json();
          set((state) => ({
            serviceTypes: state.serviceTypes.map(t => t.id === id ? updated : t)
          }));
        } catch (error) {
          console.error("Error updating service type:", error);
          throw error;
        }
      },

      deleteServiceType: async (id) => {
        try {
          const res = await fetch(`/api/services/types/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Delete service type failed");
          set((state) => ({
            serviceTypes: state.serviceTypes.filter(t => t.id !== id)
          }));
        } catch (error) {
          console.error("Error deleting service type:", error);
          throw error;
        }
      },

      // --- SUPPLIER ACTIONS ---
      fetchSuppliers: async () => {
        try {
          const res = await fetch('/api/suppliers');
          if (!res.ok) throw new Error("Fetch suppliers failed");
          const data = await res.json();
          set({ suppliers: data });
        } catch (error) {
          console.error("Error fetching suppliers:", error);
          throw error;
        }
      },

      addSupplier: async (s: Omit<Supplier, 'id'>) => {
        try {
          const res = await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(s)
          });
          if (!res.ok) throw new Error("Add supplier failed");
          const newSupplier = await res.json();
          set((state) => ({ suppliers: [...state.suppliers, newSupplier] }));
        } catch (error) {
          console.error("Error adding supplier:", error);
          throw error;
        }
      },

      updateSupplier: async (id: string, updates: Partial<Supplier>) => {
        try {
          const res = await fetch(`/api/suppliers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Update supplier failed");
          const updated = await res.json();
          set((state) => ({
            suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...updated } : s)
          }));
        } catch (error) {
          console.error("Error updating supplier:", error);
          throw error;
        }
      },

      deleteSupplier: async (id: string) => {
        try {
          const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Delete supplier failed");
          set((state) => ({
            suppliers: state.suppliers.filter(s => s.id !== id)
          }));
        } catch (error) {
          console.error("Error deleting supplier:", error);
          throw error;
        }
      },

      // --- PURCHASE ORDER ACTIONS ---
      fetchPurchaseOrders: async () => {
        try {
          const res = await fetch('/api/purchase-orders');
          if (!res.ok) throw new Error("Fetch purchase orders failed");
          const data = await res.json();
          set({ purchaseOrders: data });
        } catch (error) {
          console.error("Error fetching purchase orders:", error);
          throw error;
        }
      },

      createPurchaseOrder: async (po) => {
        try {
          const res = await fetch('/api/purchase-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(po)
          });
          if (!res.ok) throw new Error("Create purchase order failed");
          const newPO = await res.json();
          set((state) => ({ purchaseOrders: [newPO, ...state.purchaseOrders] }));
          return newPO.id;
        } catch (error) {
          console.error("Error creating purchase order:", error);
          throw error;
        }
      },

      sendPurchaseOrder: async (id: string) => {
        try {
          const res = await fetch(`/api/purchase-orders/${id}/send`, { method: 'POST' });
          if (!res.ok) throw new Error("Send purchase order failed");
          set((state) => ({
            purchaseOrders: state.purchaseOrders.map(po =>
              po.id === id ? { ...po, status: 'Sent' as const } : po
            )
          }));
        } catch (error) {
          console.error("Error sending purchase order:", error);
          throw error;
        }
      },

      cancelPurchaseOrder: async (id: string) => {
        try {
          const res = await fetch(`/api/purchase-orders/${id}/cancel`, { method: 'POST' });
          if (!res.ok) throw new Error("Cancel purchase order failed");
          set((state) => ({
            purchaseOrders: state.purchaseOrders.map(po =>
              po.id === id ? { ...po, status: 'Cancelled' as const } : po
            )
          }));
        } catch (error) {
          console.error("Error cancelling purchase order:", error);
          throw error;
        }
      },

      // --- GOODS RECEIPT ACTIONS ---
      fetchGoodsReceipts: async () => {
        try {
          const res = await fetch('/api/goods-receipts');
          if (!res.ok) throw new Error("Fetch goods receipts failed");
          const data = await res.json();
          set({ goodsReceipts: data });
        } catch (error) {
          console.error("Error fetching goods receipts:", error);
          throw error;
        }
      },

      createGoodsReceipt: async (gr) => {
        try {
          const res = await fetch('/api/goods-receipts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gr)
          });
          if (!res.ok) throw new Error("Create goods receipt failed");
          const newGR = await res.json();
          set((state) => ({
            goodsReceipts: [newGR, ...state.goodsReceipts],
            stocks: state.stocks.map(s => {
              const receivedItem = gr.items.find(i => i.itemId === s.itemId && s.branchId === gr.branchId);
              return receivedItem ? { ...s, quantity: s.quantity + receivedItem.quantity } : s;
            }),
            // Also update PO status in local state if returned by API
            purchaseOrders: state.purchaseOrders.map(po =>
              po.id === gr.poId ? { ...po, status: newGR.po?.status ?? po.status } : po
            )
          }));
        } catch (error) {
          console.error("Error creating goods receipt:", error);
          throw error;
        }
      },

      // --- STOCK OUT ACTIONS ---
      fetchStockOuts: async () => {
        try {
          const res = await fetch('/api/stock-out');
          if (!res.ok) throw new Error("Fetch stock outs failed");
          const data = await res.json();
          set({ stockOuts: data });
        } catch (error) {
          console.error("Error fetching stock outs:", error);
          throw error;
        }
      },

      createStockOut: async (so) => {
        try {
          const res = await fetch('/api/stock-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(so)
          });
          if (!res.ok) throw new Error("Create stock out failed");
          const newSO = await res.json();
          set((state) => ({
            stockOuts: [newSO, ...state.stockOuts],
            stocks: state.stocks.map(s => {
              const outItem = so.items.find(i => i.itemId === s.itemId && s.branchId === so.branchId);
              return outItem ? { ...s, quantity: Math.max(0, s.quantity - outItem.quantity) } : s;
            })
          }));
        } catch (error) {
          console.error("Error creating stock out:", error);
          throw error;
        }
      },

      // --- SUPPLIER RETURN ACTIONS ---
      fetchSupplierReturns: async () => {
        try {
          const res = await fetch('/api/supplier-returns');
          if (!res.ok) throw new Error("Fetch supplier returns failed");
          const data = await res.json();
          set({ supplierReturns: data });
        } catch (error) {
          console.error("Error fetching supplier returns:", error);
          throw error;
        }
      },

      createSupplierReturn: async (sr) => {
        try {
          const res = await fetch('/api/supplier-returns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sr)
          });
          if (!res.ok) throw new Error("Create supplier return failed");
          const newSR = await res.json();
          set((state) => ({
            supplierReturns: [newSR, ...state.supplierReturns]
          }));
          return newSR.id;
        } catch (error) {
          console.error("Error creating supplier return:", error);
          throw error;
        }
      },

      sendSupplierReturn: async (id) => {
        try {
          const res = await fetch(`/api/supplier-returns/${id}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) throw new Error("Send supplier return failed");
          set((state) => {
            const sr = state.supplierReturns.find(r => r.id === id);
            return {
              supplierReturns: state.supplierReturns.map(r =>
                r.id === id ? { ...r, status: 'Sent' as const } : r
              ),
              stocks: sr ? state.stocks.map(s => {
                const returnItem = sr.items.find(i => i.itemId === s.itemId && s.branchId === sr.branchId);
                return returnItem ? { ...s, quantity: Math.max(0, s.quantity - returnItem.quantity) } : s;
              }) : state.stocks
            };
          });
        } catch (error) {
          console.error("Error sending supplier return:", error);
          throw error;
        }
      },

      // --- STOCK AUDIT ACTIONS ---
      fetchStockAudits: async () => {
        try {
          const res = await fetch('/api/stock-audits');
          if (!res.ok) throw new Error("Fetch stock audits failed");
          const data = await res.json();
          set({ stockAudits: data });
        } catch (error) {
          console.error("Error fetching stock audits:", error);
          throw error;
        }
      },

      createStockAudit: async (branchId: string, notes?: string) => {
        try {
          const res = await fetch('/api/stock-audits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchId, notes })
          });
          if (!res.ok) throw new Error("Create stock audit failed");
          const newAudit = await res.json();
          set((state) => ({
            stockAudits: [newAudit, ...state.stockAudits]
          }));
          return newAudit.id;
        } catch (error) {
          console.error("Error creating stock audit:", error);
          throw error;
        }
      },

      updateStockAuditItems: async (auditId: string, items: { id: string; physicalQty: number }[]) => {
        try {
          const res = await fetch(`/api/stock-audits/${auditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
          });
          if (!res.ok) throw new Error("Update stock audit items failed");
          const updatedAudit = await res.json();
          set((state) => ({
            stockAudits: state.stockAudits.map(a =>
              a.id === auditId ? { ...updatedAudit, status: a.status === 'Open' ? 'InProgress' as const : a.status } : a
            )
          }));
        } catch (error) {
          console.error("Error updating stock audit items:", error);
          throw error;
        }
      },

      applyStockAudit: async (auditId: string) => {
        try {
          const res = await fetch(`/api/stock-audits/${auditId}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) throw new Error("Apply stock audit failed");
          set((state) => {
            const audit = state.stockAudits.find(a => a.id === auditId);
            return {
              stockAudits: state.stockAudits.map(a =>
                a.id === auditId ? { ...a, status: 'Completed' as const } : a
              ),
              stocks: audit ? state.stocks.map(s => {
                const auditItem = audit.items.find(i => i.itemId === s.itemId && s.branchId === audit.branchId);
                return auditItem?.physicalQty !== undefined
                  ? { ...s, quantity: auditItem.physicalQty }
                  : s;
              }) : state.stocks
            };
          });
        } catch (error) {
          console.error("Error applying stock audit:", error);
          throw error;
        }
      },
    }),

    {
      name: 'kasirai-pos-storage',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Zustand rehydration error:', error);
          }
          // state can be undefined if rehydration fails — always mark hydrated
          if (state) {
            state.setHasHydrated(true);
          }
        };
      }
    }

  )
);
