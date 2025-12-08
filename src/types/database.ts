export type BusinessMode = 'subscription' | 'retail'
export type UserRole = 'user' | 'super_admin'
export type SubscriptionStatus = 'active' | 'expired' | 'trial' | 'cancelled'
export type TransactionType = 'subscription' | 'retail' | 'service' | 'debt_payment' | 'sale'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'debt'

// Plan types for better UX:
// - 'subscription': Time-based (days) - e.g., monthly, yearly
// - 'package': Multiple sessions - e.g., 10 lessons pack
// - 'single': One-time single session - e.g., حصة واحدة
export type PlanType = 'subscription' | 'package' | 'single'

// Member status calculated from expires_at or sessions
export type MemberStatus = 'active' | 'expiring_soon' | 'expired' | 'frozen'

export type Profile = {
  id: string
  full_name: string
  phone_number: string | null
  business_mode: BusinessMode
  pin_code: string | null
  role: UserRole
  is_active: boolean
  is_paused: boolean
  pause_reason: string | null
  subscription_status: SubscriptionStatus
  subscription_end_date: string | null
  subscription_days: number | null
  created_at: string
  updated_at: string
}

export type SubscriptionPlan = {
  id: string
  business_id: string
  name: string
  price: number
  duration_days: number // -1 = unlimited, 0 = session-based, >0 = days
  sessions: number // number of sessions for session/package plans (0 = time-based)
  plan_type: PlanType // 'subscription' | 'package' | 'single'
  is_active: boolean
  created_at: string
}

export type Member = {
  id: string
  business_id: string
  member_code: string | null
  name: string
  phone: string
  email: string | null
  plan_id: string | null
  plan_name: string
  plan_type: PlanType // 'subscription' | 'package' | 'single'
  plan_start_at: string | null // when the current plan started
  expires_at: string | null // NULL for single sessions (they don't expire by time)
  is_frozen: boolean
  frozen_at: string | null
  freeze_days: number
  debt: number
  sessions_total: number // total sessions purchased (0 = time-based subscription)
  sessions_used: number // sessions already used
  notes: string | null
  created_at: string
  updated_at: string
  // Computed fields
  status?: MemberStatus
  days_remaining?: number
}

export type SubscriptionHistory = {
  id: string
  business_id: string
  member_id: string
  plan_id: string | null
  plan_name: string
  type: 'subscription' | 'session_add' | 'session_use' | 'plan_change' | 'service' | 'freeze' | 'unfreeze' | 'cancellation'
  sessions_added: number
  sessions_before: number
  sessions_after: number
  expires_before: string | null
  expires_after: string | null
  amount: number
  payment_method: 'cash' | 'debt' | null
  notes: string | null
  created_at: string
  // Plan change fields
  old_plan_id?: string | null
  new_plan_id?: string | null
  old_plan_name?: string | null
  new_plan_name?: string | null
}

export type Category = {
  id: string
  business_id: string
  name: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export type Product = {
  id: string
  business_id: string
  name: string
  description: string | null
  price: number
  cost: number
  cost_price: number // alias for cost
  stock: number | null
  reorder_level: number
  category: string
  category_id: string | null
  barcode: string | null
  image_url: string | null
  track_stock: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Service = {
  id: string
  business_id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  is_active: boolean
  created_at: string
}

export type TransactionItemData = {
  product_id: string
  name: string
  quantity: number
  price: number
  total_price: number
}

export type Transaction = {
  id: string
  business_id: string
  member_id: string | null
  customer_id: string | null
  type: TransactionType
  payment_method: PaymentMethod
  amount: number
  discount: number
  notes: string | null
  items: TransactionItemData[] | null
  created_at: string
}

export type RetailCustomer = {
  id: string
  business_id: string
  name: string
  phone: string | null
  total_debt: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DebtPayment = {
  id: string
  business_id: string
  customer_id: string
  transaction_id: string | null
  amount: number
  payment_type: 'full' | 'partial'
  notes: string | null
  created_at: string
}

export type Expense = {
  id: string
  business_id: string
  amount: number
  category: string
  date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type TransactionItem = {
  id: string
  transaction_id: string
  product_id: string | null
  service_id: string | null
  name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export type CheckIn = {
  id: string
  business_id: string
  member_id: string
  checked_in_at: string
  checked_out_at: string | null
  notes: string | null
}

// Cart types for POS
export type CartItem = {
  id: string
  type: 'product' | 'service'
  name: string
  price: number
  quantity: number
  stock?: number
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'role' | 'is_active' | 'is_paused' | 'pause_reason' | 'subscription_status' | 'subscription_end_date' | 'subscription_days'> & { 
          created_at?: string
          updated_at?: string
          role?: UserRole
          is_active?: boolean
          is_paused?: boolean
          pause_reason?: string | null
          subscription_status?: SubscriptionStatus
          subscription_end_date?: string | null
          subscription_days?: number | null
        }
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      members: {
        Row: Member
        Insert: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'member_code'>
        Update: Partial<Omit<Member, 'id' | 'created_at' | 'business_id'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'business_id'>>
      }
      services: {
        Row: Service
        Insert: Omit<Service, 'id' | 'created_at'>
        Update: Partial<Omit<Service, 'id' | 'created_at' | 'business_id'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'business_id'>>
      }
      subscription_plans: {
        Row: SubscriptionPlan
        Insert: Omit<SubscriptionPlan, 'id' | 'created_at'>
        Update: Partial<Omit<SubscriptionPlan, 'id' | 'created_at' | 'business_id'>>
      }
    }
    Enums: {
      business_mode: BusinessMode
      user_role: UserRole
    }
  }
}
