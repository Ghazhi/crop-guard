import { DashboardLayout } from '@/customComponents/DashboardLayout'
import { getSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return <DashboardLayout initialRole={session?.role} initialUser={session?.user}>{children}</DashboardLayout>
}
