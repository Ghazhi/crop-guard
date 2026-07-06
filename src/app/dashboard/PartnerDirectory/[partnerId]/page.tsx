import { Main } from './_widgets/main'

export default async function PartnerDetailPage({ params }: { params: Promise<{ partnerId: string }> }) {
  const { partnerId } = await params
  return <Main partnerId={partnerId} />
}
