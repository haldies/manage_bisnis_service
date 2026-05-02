// Application types
export interface Application {
  id: string;
  name: string;
  package_name: string;
  service_account_json?: string;
  created_at: string;
  status?: 'connected' | 'error' | 'pending';
  last_sync?: string;
  total_revenue?: number;
  active_subscriptions?: number;
  total_purchases?: number;
  active_users?: number;
}

// Subscription catalog entry
export interface Subscription {
  id: string;
  app_id: string;
  app_name?: string;
  product_id: string;
  name: string;
  price_usd: number;
  interval: 'monthly' | 'yearly' | 'weekly';
  is_active: boolean;
  created_at: string;
  subscriber_count?: number;
}

// Individual subscription purchase by a user
export interface SubscriptionPurchase {
  id: string;
  app_id: string;
  app_name?: string;
  subscription_id: string;
  subscription_name?: string;
  product_id: string;
  user_id: string;
  purchase_token: string;
  start_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  last_validated_at?: string;
  created_at: string;
}

// One-time product purchase
export interface OneTimePurchase {
  id: string;
  app_id: string;
  app_name?: string;
  product_id: string;
  product_name: string;
  user_id: string;
  purchase_token: string;
  price_usd: number;
  purchased_at: string;
  status: 'completed' | 'refunded' | 'pending';
  last_validated_at?: string;
  created_at: string;
}

// Unified transaction entry
export interface Transaction {
  id: string;
  type: 'subscription' | 'one_time';
  app_id: string;
  app_name?: string;
  product_id: string;
  product_name: string;
  user_id: string;
  amount_usd: number;
  date: string;
  status: string;
}

// Revenue data for charts
export interface RevenueDataPoint {
  month: string;
  [appName: string]: number | string;
}

// Dashboard metrics
export interface DashboardMetrics {
  total_active_subscriptions: number;
  total_one_time_purchases: number;
  total_revenue_usd: number;
  active_users: number;
  subscription_growth_pct: number;
  revenue_growth_pct: number;
  purchases_growth_pct: number;
  users_growth_pct: number;
}

// API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Google Play validation result
export interface ValidationResult {
  token: string;
  status: 'active' | 'expired' | 'cancelled' | 'invalid';
  expiry_date?: string;
  error?: string;
}

// Sync result
export interface SyncResult {
  app_id: string;
  synced_subscriptions: number;
  synced_purchases: number;
  errors: string[];
  synced_at: string;
}
// Retail Product
export interface RetailProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  stock: number;
}

// Cart Item
export interface CartItem {
  product: RetailProduct;
  quantity: number;
}

// Retail Transaction
export interface RetailTransaction {
  id: string;
  items: CartItem[];
  total: number;
  date: string;
  paymentMethod: 'cash' | 'card' | 'qris';
}
