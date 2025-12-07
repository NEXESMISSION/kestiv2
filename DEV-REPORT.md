# KESTI Pro - Developer Report
## Complete Technical Documentation (v2 - Remade POS & Dashboard)

**Last Updated: December 2024**

---

## 📋 Project Overview

**KESTI Pro** is a subscription management POS (Point of Sale) system designed for subscription-based businesses like gyms, clubs, training centers, and any business that sells memberships or session packages.

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Icons | Lucide React |
| Deployment | Vercel/Netlify |

---

## 🏗️ Project Structure

```
kesti v2/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── admin/                    # Redirects to /superadmin
│   │   ├── api/admin/users/          # API routes for admin
│   │   ├── dashboard/                # Main dashboard
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── DashboardClient.tsx   # Dashboard client component
│   │   │   ├── plans/                # Subscription plans management
│   │   │   ├── products/             # Products management (retail)
│   │   │   ├── services/             # Services management
│   │   │   └── settings/             # Business settings
│   │   ├── pos/                      
│   │   │   ├── page.tsx              # Redirects to /pos/subscription
│   │   │   └── subscription/         # Main POS page ⭐
│   │   ├── superadmin/               # Super admin panel
│   │   ├── login/                    # Login page
│   │   ├── register/                 # Registration page
│   │   ├── expired/                  # Subscription expired page
│   │   ├── paused/                   # Account paused page
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home (redirects)
│   │   └── globals.css               # Global styles
│   │
│   ├── components/
│   │   ├── shared/
│   │   │   └── PINModal.tsx          # PIN entry modal for dashboard access
│   │   └── subscription/
│   │       ├── MemberCard.tsx        # Member card display
│   │       ├── MemberModal.tsx       # Member details/renew modal
│   │       ├── CheckInModal.tsx      # Check-in & session use modal
│   │       └── NewMemberModal.tsx    # Add new member modal
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   ├── server.ts             # Server Supabase client
│   │   │   └── middleware.ts         # Auth middleware helpers
│   │   ├── utils/
│   │   │   └── member.ts             # Member utility functions ⭐
│   │   └── validations/
│   │       └── auth.ts               # Auth validation schemas
│   │
│   ├── types/
│   │   └── database.ts               # TypeScript type definitions ⭐
│   │
│   └── middleware.ts                 # Next.js middleware
│
├── supabase-schema-v2.sql            # Base database schema
├── database-migration.sql            # Schema updates/migrations
└── package.json
```

---

## 🗄️ Database Schema

### Core Tables

#### 1. `profiles` (Users/Businesses)
```sql
- id: UUID (from auth.users)
- full_name: TEXT
- phone_number: TEXT
- business_mode: 'subscription' | 'retail'
- pin_code: TEXT (for dashboard access)
- role: 'user' | 'super_admin'
- is_active: BOOLEAN
- is_paused: BOOLEAN
- pause_reason: TEXT
- subscription_status: 'active' | 'expired' | 'trial' | 'cancelled'
- subscription_end_date: TIMESTAMPTZ
- subscription_days: INTEGER
```

#### 2. `subscription_plans` (Plan Templates)
```sql
- id: UUID
- business_id: UUID (FK to profiles)
- name: TEXT
- price: DECIMAL(10,3)
- duration_days: INTEGER
  - 0 = session-based (single or package)
  - >0 = time-based subscription
- sessions: INTEGER
  - 0 = time-based subscription
  - 1 = single session
  - >1 = package
- plan_type: 'subscription' | 'package' | 'single'
- is_active: BOOLEAN
```

#### 3. `members` (Customers)
```sql
- id: UUID
- business_id: UUID
- member_code: TEXT (auto-generated: M0001, M0002...)
- name: TEXT
- phone: TEXT
- email: TEXT (optional)
- plan_id: UUID (FK to subscription_plans)
- plan_name: TEXT
- plan_type: 'subscription' | 'package' | 'single'
- plan_start_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ (NULL for single sessions!)
- is_frozen: BOOLEAN
- frozen_at: TIMESTAMPTZ
- freeze_days: INTEGER
- debt: DECIMAL(10,3)
- sessions_total: INTEGER (0 for time-based)
- sessions_used: INTEGER
- notes: TEXT
```

#### 4. `subscription_history` (Activity Log)
```sql
- id: UUID
- business_id: UUID
- member_id: UUID
- plan_id: UUID
- plan_name: TEXT
- type: 'subscription' | 'session_add' | 'session_use' | 'plan_change'
- sessions_added: INTEGER
- sessions_before: INTEGER
- sessions_after: INTEGER
- expires_before: TIMESTAMPTZ
- expires_after: TIMESTAMPTZ
- amount: DECIMAL(10,3)
- payment_method: 'cash' | 'debt'
- old_plan_id: UUID (for plan_change)
- new_plan_id: UUID (for plan_change)
- old_plan_name: TEXT
- new_plan_name: TEXT
```

#### 5. `transactions` (Financial Records)
```sql
- id: UUID
- business_id: UUID
- member_id: UUID (optional)
- type: 'subscription' | 'retail' | 'service' | 'debt_payment'
- payment_method: 'cash' | 'card' | 'transfer' | 'debt'
- amount: DECIMAL(10,3)
- discount: DECIMAL(10,3)
- notes: TEXT
```

---

## 🎯 Plan Types System

### Three Plan Types

| Type | Arabic | Icon | Color | Duration | Sessions | Use Case |
|------|--------|------|-------|----------|----------|----------|
| `subscription` | اشتراك | 📅 Calendar | Blue | X days | 0 | Monthly gym membership |
| `package` | باقة حصص | 📦 Package | Purple | 0 | X sessions | 10-lesson pack |
| `single` | حصة واحدة | ⚡ Zap | Orange | 0 | 1 | Drop-in visit |

### Database Values
```typescript
// Single Session
{ duration_days: 0, sessions: 1, plan_type: 'single', expires_at: NULL }

// Package (10 sessions)
{ duration_days: 0, sessions: 10, plan_type: 'package', expires_at: NULL }

// Monthly Subscription
{ duration_days: 30, sessions: 0, plan_type: 'subscription', expires_at: '2024-02-01' }
```

### Critical Rule: Single Sessions NEVER Expire
```typescript
// WRONG ❌
if (expires_at < now) return 'expired'

// CORRECT ✅
if (plan_type === 'single') {
  return sessions_used >= 1 ? 'single_used' : 'single_available'
}
```

---

## 🎨 UI/UX Design System

### Color Scheme by Plan Type

| Plan Type | Background | Border | Badge | Text |
|-----------|------------|--------|-------|------|
| Single ⚡ | `orange-50` | `orange-200` | `orange-500` | `orange-700` |
| Package 📦 | `purple-50` | `purple-200` | `purple-500` | `purple-700` |
| Subscription 📅 | `blue-50` | `blue-200` | `blue-500` | `blue-700` |

### Status Colors

| Status | Background | Badge | Arabic |
|--------|------------|-------|--------|
| Active | `green-50` | `green-500` | نشط |
| Expiring Soon | `yellow-50` | `yellow-500` | ينتهي قريباً |
| Expired | `red-50` | `red-500` | منتهي |
| Frozen | `blue-50` | `blue-500` | ❄️ مجمد |
| Single Available | `orange-50` | `orange-500` | ⚡ متاحة |
| Single Used | `gray-50` | `gray-400` | تم استخدامها |

### Arabic Text (RTL)
All pages use `dir="rtl"` for right-to-left layout.

#### Key Arabic Terms
```
نقطة البيع = Point of Sale (POS)
عميل جديد = New Customer
لوحة التحكم = Dashboard
تسجيل الخروج = Logout
اشتراك = Subscription
باقة حصص = Session Package
حصة واحدة = Single Session
تجديد = Renew
تغيير الخطة = Change Plan
السجل = History
تجميد = Freeze
إلغاء التجميد = Unfreeze
نقداً = Cash
دين = Debt
منتهي = Expired
نشط = Active
ينتهي قريباً = Expiring Soon
```

---

## 📱 Key Pages & Components

### 1. POS Page (`/pos/subscription`)
**Main working screen for daily operations**

Features:
- Member list with search & filters
- Filter by: All, Active, Expired, Single, Package, Subscription, Frozen
- Member cards with status badges
- Click card → Member detail modal
- Header buttons: New Member, Dashboard (PIN), Logout

```typescript
// Filter types
type FilterType = 'all' | 'active' | 'expired' | 'single' | 'package' | 'subscription' | 'frozen'
```

### 2. Member Card (`MemberCard.tsx`)
Displays member info with visual status

```
┌─────────────────────────────────────┐
│ ⚡ [Ahmed Hassan]        [متاحة]   │
│ 📱 55123456                         │
│ حصة واحدة                          │
│                      [⚡ استخدام]   │
└─────────────────────────────────────┘
```

### 3. Member Detail Modal
Shows when clicking a member card

Tabs:
1. **Info** - Basic info, plan details, status
2. **History** - Subscription history log
3. **Actions** - Use session, Add session, Renew

### 4. Plans Page (`/dashboard/plans`)
Create and manage plan templates

Plan Type Selection:
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   📅     │  │   📦     │  │   ⚡     │
│ اشتراك  │  │ باقة حصص │  │حصة واحدة │
│ بالأيام  │  │ عدة حصص  │  │ مرة واحدة│
└──────────┘  └──────────┘  └──────────┘
```

Conditional Fields:
- **Subscription**: Duration (days) picker (7, 30, 90, 365)
- **Package**: Session count picker (5, 10, 20, 30)
- **Single**: Just price (info box explaining it's one session)

### 5. New Member Modal
Add new customer with plan selection

Flow:
1. Enter name, phone, email (optional)
2. Select plan (grouped by type)
3. Choose payment: Cash or Debt
4. Creates member + transaction

### 6. PIN Modal
Protects dashboard access from POS

- Numpad interface
- Shows PIN dots as entered
- Error shake animation on wrong PIN
- Keyboard support (0-9, Backspace, Escape)

---

## 🔧 Utility Functions (`lib/utils/member.ts`)

### Core Functions

```typescript
// Get plan type from member data
getMemberPlanType(member: Member): PlanType

// Get member status
getMemberStatus(member: Member): MemberStatus
// Returns: 'active' | 'expiring_soon' | 'expired' | 'frozen' | 'single_available' | 'single_used'

// Check if member has session-based plan
isSessionBased(member: Member): boolean

// Check if single session plan
isSingleSession(member: Member): boolean

// Check if single session was used
isSingleSessionUsed(member: Member): boolean

// Get remaining sessions
getSessionsRemaining(member: Member): number

// Get days remaining (for subscriptions)
getDaysRemaining(expiresAt: string): number

// Get display text for status
getStatusDisplay(member: Member): { text: string, color: string, icon: string }
```

### Status Logic

```typescript
export function getMemberStatus(member: Member): MemberStatus {
  // Frozen takes priority
  if (member.is_frozen) return 'frozen'
  
  const planType = getMemberPlanType(member)
  
  // SINGLE SESSION - Never time-expires!
  if (planType === 'single') {
    return member.sessions_used >= 1 ? 'single_used' : 'single_available'
  }
  
  // PACKAGE - Check sessions remaining
  if (planType === 'package') {
    const remaining = member.sessions_total - member.sessions_used
    if (remaining <= 0) return 'expired'
    return 'active'
  }
  
  // SUBSCRIPTION - Check time expiry
  if (!member.expires_at) return 'active'
  
  const now = new Date()
  const expires = new Date(member.expires_at)
  const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= 7) return 'expiring_soon'
  return 'active'
}
```

---

## 🔐 Authentication Flow

### User Roles
1. **user** - Regular business owner (uses POS + Dashboard)
2. **super_admin** - Platform admin (manages all users)

### Auth Flow
```
/login → Supabase Auth → Check Role
  ├── super_admin → /superadmin
  └── user → /pos/subscription
```

### PIN Protection
Dashboard access from POS requires PIN:
```
POS → Click "لوحة التحكم" → PIN Modal → /dashboard
```

### Session Checks
```typescript
// In page components
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

// Check subscription status
if (profile?.is_paused) redirect('/paused')
if (profile?.subscription_status === 'expired') redirect('/expired')
```

---

## 💾 Database Operations

### Create Member with Plan
```typescript
// 1. Calculate expiry based on plan type
let expiresAt = null
let sessionsTotal = 0

if (plan.duration_days > 0) {
  // Time-based subscription
  const exp = new Date()
  exp.setDate(exp.getDate() + plan.duration_days)
  expiresAt = exp.toISOString()
} else {
  // Session-based (single or package)
  sessionsTotal = plan.sessions || 1
  // expiresAt stays NULL!
}

// 2. Insert member
await supabase.from('members').insert({
  business_id: user.id,
  name: data.name,
  phone: data.phone,
  plan_id: plan.id,
  plan_name: plan.name,
  plan_type: plan.plan_type,
  plan_start_at: new Date().toISOString(),
  expires_at: expiresAt,
  sessions_total: sessionsTotal,
  sessions_used: 0,
  debt: paymentMethod === 'debt' ? plan.price : 0
})

// 3. Create transaction
await supabase.from('transactions').insert({
  business_id: user.id,
  type: 'subscription',
  payment_method: paymentMethod,
  amount: plan.price
})
```

### Use Session
```typescript
// 1. Update member
await supabase
  .from('members')
  .update({ sessions_used: member.sessions_used + 1 })
  .eq('id', member.id)

// 2. Log history
await supabase.from('subscription_history').insert({
  business_id: user.id,
  member_id: member.id,
  plan_name: member.plan_name,
  type: 'session_use',
  sessions_before: member.sessions_used,
  sessions_after: member.sessions_used + 1
})
```

### Renew/Change Plan
```typescript
// For plan change, log the old and new plan
await supabase.from('subscription_history').insert({
  type: 'plan_change',
  old_plan_id: member.plan_id,
  old_plan_name: member.plan_name,
  new_plan_id: newPlan.id,
  new_plan_name: newPlan.name,
  // ... other fields
})
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Single session shows as "منتهي"
**Cause**: Code checking `expires_at < now`
**Fix**: Check plan_type first, single sessions have `expires_at = NULL`

### Issue 2: Duration showing "0 days" for packages
**Cause**: Using duration_days for session-based plans
**Fix**: Display sessions count instead, hide duration for non-subscriptions

### Issue 3: Member card not updating after action
**Cause**: Not refreshing data after mutation
**Fix**: Call `fetchData()` after every database operation

### Issue 4: PIN modal not working
**Cause**: PIN not fetched from profile
**Fix**: Fetch `pin_code` from profiles table on page load

---

## 📝 SQL Migrations

### Run in Supabase SQL Editor

#### 1. Base Schema
Run `supabase-schema-v2.sql` first for fresh installs.

#### 2. Updates
Run `database-migration.sql` for existing databases:
- Adds `sessions` column to plans
- Adds `sessions_total`, `sessions_used` to members
- Adds `plan_type`, `plan_start_at` columns
- Creates `subscription_history` table
- Sets `expires_at = NULL` for single sessions

---

## 🚀 Deployment Notes

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Build Command
```bash
npm run build
```

### Start Command
```bash
npm run start
```

---

## ✅ Feature Checklist

- [x] User authentication (login/register)
- [x] Three plan types (subscription, package, single)
- [x] Member management (CRUD)
- [x] POS page with filtering
- [x] Session tracking and usage
- [x] Plan change system
- [x] Debt management
- [x] Freeze/Unfreeze functionality
- [x] PIN-protected dashboard access
- [x] Transaction history
- [x] Subscription history logging
- [x] Arabic RTL interface
- [x] Mobile-responsive design

---

## 📞 Support

For questions about this codebase, refer to:
1. This document
2. Type definitions in `src/types/database.ts`
3. Utility functions in `src/lib/utils/member.ts`
4. Database schema in SQL files

---

*Last Updated: December 2024*
*Version: 2.0*
