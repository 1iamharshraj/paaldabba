import { useParams } from 'react-router'
import LedgerView from '@/components/LedgerView'

export default function ClientLedger() {
  const { clientId } = useParams<{ clientId: string }>()
  const id = Number(clientId)
  if (!Number.isFinite(id)) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white/60 font-mono-data text-xs uppercase tracking-widest">
        Invalid client
      </div>
    )
  }
  return <LedgerView userId={id} editable={true} />
}
