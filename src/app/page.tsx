import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { LandingPage } from './_widgets/LandingPage'

const ROLE_HOME: Record<string, string> = {
  partner:     '/dashboard/PartnerPortal',
  finance:     '/dashboard/FinancePortal',
  pm:          '/dashboard/ProgramManager',
  staff:       '/dashboard/Dashboard',
  super_admin: '/superadmin',
}

export default async function RootPage() {
  const session = await getSession()
  if (session) redirect(ROLE_HOME[session.role] ?? '/dashboard/Dashboard')
  return <LandingPage />
}
