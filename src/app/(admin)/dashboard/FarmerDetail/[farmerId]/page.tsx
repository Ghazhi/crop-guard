import { Main } from './_widgets/main'

interface Props {
  params: Promise<{ farmerId: string }>
}

export default async function FarmerDetailPage({ params }: Props) {
  const { farmerId } = await params
  return <Main farmerId={farmerId} />
}
