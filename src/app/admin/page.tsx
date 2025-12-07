import { redirect } from 'next/navigation'

// Redirect old /admin route to new /superadmin
export default function AdminPage() {
  redirect('/superadmin')
}
