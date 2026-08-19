import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { CLIENTS_PATH } from '@/const'
import MilkBottle from '@/components/MilkBottle'
import {
  CURRENCIES,
  currencySymbol,
  dateKey,
  dayLabel,
  entryCostCents,
  formatMl,
  formatMoney,
  monthKey,
  monthLabel,
  shiftMonth,
  todayKey,
} from '@/lib/milk'

const PRESETS = [250, 500, 750, 1000]

export type LedgerViewProps = {
  userId?: number
  editable?: boolean
}

export default function LedgerView({ userId, editable = true }: LedgerViewProps) {
  const { user, isLoading: authLoading, logout, isMilkman } = useAuth()

  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [customMl, setCustomMl] = useState('')
  const [justAdded, setJustAdded] = useState(false)

  const utils = trpc.useUtils()
  const settingsInput = userId ? { clientId: userId } : undefined
  const settings = trpc.milk.settings.useQuery(settingsInput, { enabled: !!user })
  const monthData = trpc.milk.month.useQuery(
    { month, clientId: userId },
    { enabled: !!user },
  )
  const historyInput = userId ? { clientId: userId } : undefined
  const history = trpc.milk.history.useQuery(historyInput, { enabled: !!user })

  const invalidate = () => {
    utils.milk.month.invalidate({ month, clientId: userId })
    utils.milk.history.invalidate(historyInput)
    utils.milk.settings.invalidate(settingsInput)
  }

  const addEntry = trpc.milk.addEntry.useMutation({
    onSuccess: () => {
      invalidate()
      setCustomMl('')
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 600)
    },
  })
  const deleteEntry = trpc.milk.deleteEntry.useMutation({ onSuccess: invalidate })
  const setPaid = trpc.milk.setPaid.useMutation({ onSuccess: invalidate })
  const updateSettings = trpc.milk.updateSettings.useMutation({ onSuccess: invalidate })

  const daysInMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m, 0).getDate()
  }, [month])

  const dayMap = useMemo(() => {
    const map = new Map<string, number>()
    monthData.data?.days.forEach((d) => map.set(d.date, d.ml))
    return map
  }, [monthData.data])

  const selectedEntries = useMemo(
    () => (monthData.data?.entries ?? []).filter((e) => e.entryDate === selectedDate),
    [monthData.data, selectedDate],
  )

  const goMonth = (delta: number) => {
    const next = shiftMonth(month, delta)
    setMonth(next)
    setSelectedDate(next === monthKey(new Date()) ? todayKey() : `${next}-01`)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="font-mono-data text-[#f5eedc]/60 text-xs tracking-[0.3em] uppercase animate-pulse">
          Pouring milk…
        </div>
      </div>
    )
  }

  const pricePerLiterCents = settings.data?.pricePerLiterCents ?? 0
  const currency = settings.data?.currency ?? 'INR'
  const totalMl = monthData.data?.totalMl ?? 0
  const totalCents = monthData.data?.totalCents ?? 0
  const paid = monthData.data?.paid ?? false
  const bottleFill = Math.min(1, totalMl / (daysInMonth * 1000))
  const selectedDayMl = dayMap.get(selectedDate) ?? 0
  const isCurrentMonth = month === monthKey(new Date())
  const showSettings = editable && !userId && !user.milkmanId

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-16">
      {/* ambient milk glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,238,220,0.09), transparent 60%)',
        }}
      />

      <div className="relative max-w-lg mx-auto px-4 sm:px-6">
        {/* header */}
        <header className="flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
            <span className="font-geist-mono font-bold tracking-[0.15em] text-sm">MILKTRACK</span>
          </Link>
          {isMilkman && (
            <Link
              to={CLIENTS_PATH}
              className="font-mono-data text-[10px] tracking-[0.2em] uppercase text-white/50 hover:text-white/80 transition-colors"
            >
              Clients
            </Link>
          )}
          <div className="flex items-center gap-3">
            <span className="font-mono-data text-[11px] text-white/45 max-w-[110px] truncate">
              {user.name ?? 'you'}
            </span>
            <button
              onClick={logout}
              className="font-mono-data text-[10px] tracking-[0.2em] uppercase milk-chip rounded-full px-3 py-1.5"
            >
              Log out
            </button>
          </div>
        </header>

        {/* month nav */}
        <div className="flex items-center justify-between mt-2 mb-4">
          <button onClick={() => goMonth(-1)} className="milk-chip rounded-full w-10 h-10 text-lg" aria-label="Previous month">
            ‹
          </button>
          <div className="text-center">
            <div className="font-geist-mono font-bold text-xl">{monthLabel(month)}</div>
            {paid && (
              <div className="font-mono-data text-[10px] tracking-[0.25em] uppercase text-emerald-300/90 mt-1">
                ✓ settled
              </div>
            )}
          </div>
          <button
            onClick={() => goMonth(1)}
            disabled={isCurrentMonth}
            className="milk-chip rounded-full w-10 h-10 text-lg disabled:opacity-30"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* summary card */}
        <section className="liquid-glass rounded-3xl p-5 sm:p-6 flex items-center gap-5">
          <div className={`shrink-0 ${justAdded ? 'splash-pop' : ''}`}>
            <MilkBottle fraction={bottleFill} className="w-20 sm:w-24" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono-data text-[10px] tracking-[0.3em] uppercase text-[#f5eedc]/50">
              This month
            </div>
            <div className="font-geist-mono font-black text-3xl sm:text-4xl mt-1 text-[#fdf9ee]">
              {formatMoney(totalCents, currency)}
            </div>
            <div className="mt-2 space-y-1 font-mono-data text-[11px] text-white/55">
              <div>{formatMl(totalMl)} total</div>
              <div>
                {monthData.data?.daysWithMilk ?? 0} day{(monthData.data?.daysWithMilk ?? 0) === 1 ? '' : 's'} with milk
                · {formatMoney(pricePerLiterCents, currency)}/L
              </div>
            </div>
            <button
              onClick={() => setPaid.mutate({ month, paid: !paid, clientId: userId })}
              disabled={!editable || setPaid.isPending || totalMl === 0}
              className={
                paid
                  ? 'mt-3 font-mono-data text-[10px] tracking-[0.2em] uppercase milk-chip rounded-full px-4 py-2'
                  : 'mt-3 milk-btn-primary rounded-full px-5 py-2.5 font-geist-mono text-xs tracking-wide'
              }
            >
              {paid ? 'Paid ✓ — undo' : 'Mark month as paid'}
            </button>
          </div>
        </section>

        {/* quick add */}
        <section className="liquid-glass rounded-3xl p-5 sm:p-6 mt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-geist-mono font-bold text-sm tracking-wide">
              {selectedDate === todayKey() ? "Today's pour" : `Pour for ${dayLabel(selectedDate)}`}
            </h2>
            <span className="font-mono-data text-[11px] text-[#f5eedc]/60">
              {selectedDayMl > 0 ? `${formatMl(selectedDayMl)} so far` : 'nothing yet'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            {PRESETS.map((ml) => (
              <button
                key={ml}
                onClick={() =>
                  addEntry.mutate({ entryDate: selectedDate, quantityMl: ml, clientId: userId })
                }
                disabled={!editable || addEntry.isPending}
                className="milk-chip rounded-2xl py-3.5 text-center active:scale-95"
              >
                <div className="font-geist-mono font-bold text-sm">
                  {ml >= 1000 ? '1 L' : `${ml}`}
                </div>
                <div className="font-mono-data text-[9px] text-white/40 mt-0.5">
                  {ml >= 1000 ? '' : 'ml'}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <div className="flex-1 flex items-center rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Custom amount"
                value={customMl}
                onChange={(e) => setCustomMl(e.target.value)}
                onKeyDown={(e) => {
                  const v = parseInt(customMl, 10)
                  if (e.key === 'Enter' && v > 0)
                    addEntry.mutate({ entryDate: selectedDate, quantityMl: v, clientId: userId })
                }}
                readOnly={!editable}
                className="w-full bg-transparent py-3 font-geist-mono text-sm outline-none placeholder:text-white/30"
              />
              <span className="font-mono-data text-[10px] text-white/40">ml</span>
            </div>
            <button
              onClick={() => {
                const v = parseInt(customMl, 10)
                if (v > 0) addEntry.mutate({ entryDate: selectedDate, quantityMl: v, clientId: userId })
              }}
              disabled={!editable || addEntry.isPending || !(parseInt(customMl, 10) > 0)}
              className="milk-btn-primary rounded-2xl px-6 font-geist-mono text-sm"
            >
              Pour
            </button>
          </div>
          {addEntry.error && (
            <p className="text-red-300/80 font-mono-data text-[11px] mt-2">{addEntry.error.message}</p>
          )}

          {/* selected day entries */}
          {selectedEntries.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedEntries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl bg-[#f5eedc]/[0.06] border border-[#f5eedc]/10 px-4 py-2.5"
                >
                  <span className="font-geist-mono text-sm">{formatMl(e.quantityMl)}</span>
                  <span className="font-mono-data text-[11px] text-white/50">
                    {formatMoney(entryCostCents(e.quantityMl, e.pricePerLiterCents), currency)}
                  </span>
                  <button
                    onClick={() => deleteEntry.mutate({ id: e.id, clientId: userId })}
                    disabled={!editable}
                    className="font-mono-data text-[10px] uppercase tracking-widest text-red-300/70 hover:text-red-300 px-2 py-1"
                    aria-label="Delete entry"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* calendar */}
        <section className="liquid-glass rounded-3xl p-5 sm:p-6 mt-4">
          <h2 className="font-geist-mono font-bold text-sm tracking-wide mb-4">Month at a glance</h2>
          <div className="grid grid-cols-7 gap-1 font-mono-data text-[9px] text-white/35 uppercase text-center mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells(month).map((cell, i) => {
              if (!cell) return <div key={i} />
              const ml = dayMap.get(cell) ?? 0
              const isToday = cell === todayKey()
              const isSelected = cell === selectedDate
              const isFuture = cell > todayKey()
              return (
                <button
                  key={i}
                  disabled={!editable || isFuture}
                  onClick={() => setSelectedDate(cell)}
                  className={[
                    'aspect-square rounded-xl flex flex-col items-center justify-center transition-all',
                    isSelected
                      ? 'bg-[#f5eedc] text-[#141311]'
                      : ml > 0
                        ? 'bg-[#f5eedc]/15 text-[#fdf9ee]'
                        : 'text-white/40',
                    isToday && !isSelected ? 'ring-1 ring-[#f5eedc]/60' : '',
                    isFuture ? 'opacity-25' : 'active:scale-90',
                  ].join(' ')}
                >
                  <span className="font-geist-mono text-[11px] font-bold leading-none">
                    {Number(cell.slice(8))}
                  </span>
                  {ml > 0 && (
                    <span
                      className={`font-mono-data text-[8px] leading-none mt-1 ${
                        isSelected ? 'text-[#141311]/70' : 'text-[#f5eedc]/60'
                      }`}
                    >
                      {ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : ml}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* settings */}
        {showSettings && (
          <SettingsCard
            pricePerLiterCents={pricePerLiterCents}
            currency={currency}
            saving={updateSettings.isPending}
            onSave={(p, c) => updateSettings.mutate({ pricePerLiterCents: p, currency: c })}
          />
        )}

        {/* history */}
        {(history.data?.length ?? 0) > 1 && (
          <section className="liquid-glass rounded-3xl p-5 sm:p-6 mt-4">
            <h2 className="font-geist-mono font-bold text-sm tracking-wide mb-4">Past months</h2>
            <div className="space-y-2">
              {history.data!
                .filter((h) => h.month !== month)
                .slice(0, 6)
                .map((h) => (
                  <button
                    key={h.month}
                    onClick={() => {
                      setMonth(h.month)
                      setSelectedDate(`${h.month}-01`)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={!editable}
                    className="w-full flex items-center justify-between rounded-xl bg-[#f5eedc]/[0.05] border border-[#f5eedc]/10 px-4 py-3 text-left active:scale-[0.98] transition-transform disabled:opacity-60"
                  >
                    <span className="font-geist-mono text-sm">{monthLabel(h.month)}</span>
                    <span className="font-mono-data text-[11px] text-white/55">
                      {formatMl(h.totalMl)} · {formatMoney(h.totalCents, currency)}
                    </span>
                    <span
                      className={`font-mono-data text-[10px] uppercase tracking-widest ${
                        h.paid ? 'text-emerald-300/90' : 'text-amber-200/80'
                      }`}
                    >
                      {h.paid ? 'paid' : 'due'}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

/** Leading blanks so the 1st lands on Monday-based columns, then each day's date key. */
function calendarCells(month: string): (string | null)[] {
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7 // Monday = 0
  const cells: (string | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(dateKey(new Date(y, m - 1, d)))
  return cells
}

function SettingsCard({
  pricePerLiterCents,
  currency,
  saving,
  onSave,
}: {
  pricePerLiterCents: number
  currency: string
  saving: boolean
  onSave: (pricePerLiterCents: number, currency: string) => void
}) {
  const [price, setPrice] = useState((pricePerLiterCents / 100).toString())
  const [cur, setCur] = useState(currency)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync when server settings first arrive / change externally
  const serverPrice = (pricePerLiterCents / 100).toString()
  if (!dirty && (price !== serverPrice || cur !== currency)) {
    setPrice(serverPrice)
    setCur(currency)
  }

  const parsed = parseFloat(price)
  const valid = Number.isFinite(parsed) && parsed >= 0

  return (
    <section className="liquid-glass rounded-3xl p-5 sm:p-6 mt-4">
      <h2 className="font-geist-mono font-bold text-sm tracking-wide mb-1">Milk rate</h2>
      <p className="font-mono-data text-[10px] text-white/40 tracking-wider mb-4">
        New entries snapshot this rate — past bills never change.
      </p>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4">
          <span className="font-mono-data text-sm text-[#f5eedc]/70 mr-2">{currencySymbol(cur)}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              setDirty(true)
              setSaved(false)
            }}
            className="w-full bg-transparent py-3 font-geist-mono text-sm outline-none"
          />
          <span className="font-mono-data text-[10px] text-white/40">/ L</span>
        </div>
        <select
          value={cur}
          onChange={(e) => {
            setCur(e.target.value)
            setDirty(true)
            setSaved(false)
          }}
          className="rounded-2xl border border-[#f5eedc]/20 bg-[#141311] px-3 font-mono-data text-sm text-[#f5eedc] outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => {
          if (!valid) return
          onSave(Math.round(parsed * 100), cur)
          setDirty(false)
          setSaved(true)
        }}
        disabled={saving || !valid || !dirty}
        className="milk-btn-primary rounded-full px-6 py-2.5 mt-3 font-geist-mono text-xs tracking-wide"
      >
        {saving ? 'Saving…' : saved && !dirty ? 'Saved ✓' : 'Save rate'}
      </button>
    </section>
  )
}
