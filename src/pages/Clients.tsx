import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { CLIENTS_PATH, LOGIN_PATH } from '@/const'
import { formatMl, formatMoney, monthKey, monthLabel } from '@/lib/milk'

type AddClientForm = {
  username: string
  password: string
  displayName: string
}

export default function Clients() {
  const utils = trpc.useUtils()
  const { user, isLoading: authLoading, isMilkman, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: LOGIN_PATH,
  })

  const clients = trpc.milk.clients.useQuery(undefined, { enabled: !!user && isMilkman })
  const addClient = trpc.auth.addClient.useMutation({
    onSuccess: async () => {
      await utils.milk.clients.invalidate()
      setForm({ username: '', password: '', displayName: '' })
      setShowForm(false)
      setFormError('')
    },
    onError: (e) => setFormError(e.message),
  })

  const [form, setForm] = useState<AddClientForm>({
    username: '',
    password: '',
    displayName: '',
  })
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')

  const currentMonth = useMemo(() => monthKey(new Date()), [])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="font-mono-data text-[#f5eedc]/60 text-xs tracking-[0.3em] uppercase animate-pulse">
          Loading clients…
        </div>
      </div>
    )
  }

  if (!isMilkman) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-white px-6">
        <h1 className="font-geist-mono font-bold text-xl">Milkmen only</h1>
        <p className="font-mono-data text-[11px] text-white/50 mt-2 text-center">
          This area is for milkmen managing their client ledgers.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 milk-btn-primary rounded-full px-6 py-2.5 font-geist-mono text-xs tracking-wide"
        >
          Back to my ledger
        </Link>
      </div>
    )
  }

  const canAdd =
    form.username.trim().length >= 3 && form.password.length >= 6

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-16">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,238,220,0.09), transparent 60%)',
        }}
      />

      <div className="relative max-w-lg mx-auto px-4 sm:px-6">
        <header className="flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
            <span className="font-geist-mono font-bold tracking-[0.15em] text-sm">MILKTRACK</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="font-mono-data text-[10px] tracking-[0.2em] uppercase text-white/50 hover:text-white/80 transition-colors"
            >
              My ledger
            </Link>
            <button
              onClick={logout}
              className="font-mono-data text-[10px] tracking-[0.2em] uppercase milk-chip rounded-full px-3 py-1.5"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="mt-2 mb-4">
          <h1 className="font-geist-mono font-bold text-2xl">Clients</h1>
          <p className="font-mono-data text-[11px] text-white/50 mt-1">
            {monthLabel(currentMonth)} · manage linked ledgers
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm((s) => !s)
            setFormError('')
          }}
          className="milk-btn-primary rounded-full px-5 py-2.5 font-geist-mono text-xs tracking-wide"
        >
          {showForm ? 'Cancel' : '+ Add client'}
        </button>

        {showForm && (
          <section className="liquid-glass rounded-3xl p-5 sm:p-6 mt-4 space-y-3">
            <h2 className="font-geist-mono font-bold text-sm tracking-wide">New client</h2>
            <input
              type="text"
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect="off"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4 py-3.5 font-geist-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f5eedc]/50 transition-colors"
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              maxLength={64}
              className="w-full rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4 py-3.5 font-geist-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f5eedc]/50 transition-colors"
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && canAdd && addClient.mutate({
                username: form.username.trim(),
                password: form.password,
                displayName: form.displayName.trim() || undefined,
              })}
              className="w-full rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4 py-3.5 font-geist-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f5eedc]/50 transition-colors"
            />
            {formError && (
              <p className="font-mono-data text-[11px] text-red-300/90 text-center">{formError}</p>
            )}
            <button
              onClick={() =>
                addClient.mutate({
                  username: form.username.trim(),
                  password: form.password,
                  displayName: form.displayName.trim() || undefined,
                })
              }
              disabled={!canAdd || addClient.isPending}
              className="milk-btn-primary rounded-full w-full py-3 font-geist-mono text-xs tracking-wide"
            >
              {addClient.isPending ? 'Creating…' : 'Create client'}
            </button>
          </section>
        )}

        <section className="mt-4 space-y-3">
          {clients.data?.map((client) => (
            <div
              key={client.id}
              className="liquid-glass rounded-3xl p-5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-geist-mono font-bold text-sm truncate">
                  {client.name ?? client.unionId}
                </div>
                <div className="font-mono-data text-[10px] text-white/50 mt-1">
                  {formatMl(client.summary.totalMl)} · {formatMoney(client.summary.totalCents, client.summary.currency ?? 'INR')}
                  {' · '}
                  <span className={client.summary.paid ? 'text-emerald-300/90' : 'text-amber-200/80'}>
                    {client.summary.paid ? 'paid' : 'due'}
                  </span>
                </div>
              </div>
              <Link
                to={`${CLIENTS_PATH}/${client.id}`}
                className="shrink-0 milk-chip rounded-full px-4 py-2 font-mono-data text-[10px] tracking-[0.15em] uppercase"
              >
                View ledger
              </Link>
            </div>
          ))}
          {clients.data?.length === 0 && (
            <div className="text-center py-12">
              <p className="font-mono-data text-[11px] text-white/40">
                No linked clients yet.
              </p>
              <p className="font-mono-data text-[10px] text-white/25 mt-1">
                Add a client to start tracking their milk.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
