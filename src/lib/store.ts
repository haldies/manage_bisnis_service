import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  User, Branch, InventoryItem, Stock, ServiceTicket, 
  Supplier, PurchaseOrder, StockTransfer, FinanceLog,
  Transaction, CartItem, PaymentMethod, StoreProfile, ReceiptSettings,
  Shift, CashAdvance, LeaveRequest, ModuleName, Role, Category, AccessLevel, Attendance, DeviceModel, ServiceType,
  InventoryUnit, StockTransferStatus
} from './types';


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
  financeLogs: FinanceLog[];
  stockTransfers: StockTransfer[];
  inventoryUnits: InventoryUnit[];
  shifts: Shift[];



  cashAdvances: CashAdvance[];
  leaveRequests: LeaveRequest[];
  overtimes: any[];
  rolePermissions: Record<Role, Record<ModuleName, AccessLevel>>;
  attendances: Attendance[];

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
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  lastFetched: number | null;



  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setBranch: (branchId: string | null) => void;
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<void>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  removeBranch: (id: string) => Promise<void>;
  
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
  updateRolePermission: (role: Role, module: ModuleName, level: AccessLevel) => void;
  addRole: (role: string) => void;
  deleteRole: (role: string) => void;
  renameRole: (oldRole: string, newRole: string) => void;
  
  addServiceType: (type: Omit<ServiceType, 'id'>) => Promise<void>;
  updateServiceType: (id: string, updates: Partial<ServiceType>) => Promise<void>;
  deleteServiceType: (id: string) => Promise<void>;

  fetchUsers: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchServices: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchBranches: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchStaffOperasional: () => Promise<void>;
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
      financeLogs: [],
      shifts: [],
      stockTransfers: [],
      inventoryUnits: [],
      cashAdvances: [],
      leaveRequests: [],
      overtimes: [],
      serviceTypes: [],
      deviceModels: [],
      rolePermissions: {
        'Admin': { 'Cashier': 'Full', 'Service': 'Full', 'Inventory': 'Full', 'Finance': 'Full', 'Staff': 'Full', 'Transactions': 'Full', 'Printers': 'Full' },
        'Manager': { 'Cashier': 'Full', 'Service': 'Full', 'Inventory': 'Full', 'Finance': 'Read', 'Staff': 'Read', 'Transactions': 'Full', 'Printers': 'Full' },
        'Cashier': { 'Cashier': 'Full', 'Service': 'Full', 'Inventory': 'Read', 'Finance': 'None', 'Staff': 'None', 'Transactions': 'Read', 'Printers': 'Full' },
        'Technician': { 'Cashier': 'None', 'Service': 'Full', 'Inventory': 'Full', 'Finance': 'None', 'Staff': 'None', 'Transactions': 'None', 'Printers': 'None' }
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
            fetchUsers(),
            fetchBranches(),
            fetchInventory(),
            fetchServices(),
            fetchTransactions(),
            fetchSettings(),
            fetchStaffOperasional(),
            fetchAttendances()
          ]);
          set({ lastFetched: now });
        } catch (error) {
          console.error("Failed to fetch initial data", error);
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
          const res = await fetch('/api/services');
          const typeRes = await fetch('/api/services/types');
          if (res.ok) {
            const data = await res.json();
            set({ services: data });
          }
          if (typeRes.ok) {
            const types = await typeRes.json();
            set({ serviceTypes: types });
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


      login: async (email: string, password: string) => {

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user.role === 'Technician') return false;
            
            // Auto-select branch if user has one assigned
            const branch = data.user.branchId 
              ? get().branches.find(b => b.id === data.user.branchId) || null 
              : null;
              
            set({ currentUser: data.user, currentBranch: branch });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Login error", error);
          return false;
        }
      },

      logout: () => set({ currentUser: null, currentBranch: null }),

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
            body: JSON.stringify({ ...item, initialStock: 0 })
          });
          if (!res.ok) throw new Error("Add item failed");
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

      updateRolePermission: (role, module, level) => {
        set((state) => ({
          rolePermissions: { 
            ...state.rolePermissions, 
            [role]: { ...state.rolePermissions[role], [module]: level } 
          }
        }));
      },

      renameRole: (oldRole: string, newRole: string) => {
        set((state) => {
          // 1. Migrate permissions from old role to new role
          const oldPerms = state.rolePermissions[oldRole as Role] || {};
          const newPermissions = { ...state.rolePermissions };
          newPermissions[newRole as Role] = { ...oldPerms };
          delete (newPermissions as any)[oldRole];

          // 2. Update all users who have the old role
          const updatedUsers = state.users.map((u) =>
            u.role === oldRole ? { ...u, role: newRole as Role } : u
          );

          return {
            rolePermissions: newPermissions,
            users: updatedUsers,
          };
        });
      },

      addRole: (role: string) => {
        set((state) => {
          if (state.rolePermissions[role]) return state; // Already exists
          return {
            rolePermissions: {
              ...state.rolePermissions,
              [role]: {} as Record<ModuleName, AccessLevel>
            }
          };
        });
      },

      deleteRole: (role: string) => {
        set((state) => {
          const newPermissions = { ...state.rolePermissions };
          delete newPermissions[role];
          
          return {
            rolePermissions: newPermissions
          };
        });
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
    }),

    {
      name: 'kasirai-pos-storage',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      onRehydrateStorage: (state) => {
        return () => state.setHasHydrated(true);
      }
    }

  )
);
