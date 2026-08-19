import { Link } from 'react-router'
import FluidSubconscious from '../sections/FluidSubconscious'
import { useAuth } from '@/hooks/useAuth'
import { CLIENTS_PATH } from '@/const'

const features = [
  {
    title: 'Log every drop',
    body: 'Some days 500 ml, some days a litre, some days nothing. Tap once and the day is logged.',
  },
  {
    title: 'Your rate, your rules',
    body: 'Set your price per litre once. Every entry snapshots the rate, so changing it never rewrites history.',
  },
  {
    title: 'Month-end bill',
    body: 'Total litres, total cost, day-by-day breakdown. Mark the month paid and move on.',
  },
  {
    title: 'In your pocket',
    body: 'Installable PWA — add it to your home screen and log milk from your phone in two taps.',
  },
]

export default function Home() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="relative min-h-screen bg-black text-white">
      <FluidSubconscious />

      {/* readability veil */}
      <div className="fixed inset-0 z-[1] bg-gradient-to-b from-black/55 via-black/25 to-black pointer-events-none" />

      <main className="relative z-[2]">
        {/* nav */}
        <header className="flex items-center justify-between px-5 sm:px-10 py-5">
          <div className="font-geist-mono font-bold tracking-[0.18em] text-sm sm:text-base flex items-center gap-2">
            <img src="/icons/icon-192.png" alt="MilkTrack" className="w-7 h-7 rounded-lg" />
            MILKTRACK
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && user?.role === 'milkman' && (
              <Link
                to={CLIENTS_PATH}
                className="font-mono-data text-[11px] sm:text-xs tracking-[0.2em] uppercase px-4 py-2 rounded-full milk-chip"
              >
                Clients
              </Link>
            )}
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="font-mono-data text-[11px] sm:text-xs tracking-[0.2em] uppercase px-4 py-2 rounded-full milk-chip"
            >
              {isAuthenticated ? 'Open app' : 'Sign in'}
            </Link>
          </div>
        </header>

        {/* hero */}
        <section className="min-h-[82vh] flex flex-col justify-center px-5 sm:px-10 max-w-5xl mx-auto">
          <p className="font-mono-data text-[10px] sm:text-xs tracking-[0.35em] uppercase text-[#f5eedc]/60 mb-5">
            The daily milk ledger
          </p>
          <h1 className="font-geist-mono font-black leading-[0.95] tracking-tight text-[13vw] sm:text-7xl lg:text-8xl">
            EVERY DROP,
            <br />
            <span className="text-[#f5eedc]">COUNTED.</span>
          </h1>
          <p className="mt-6 max-w-md text-sm sm:text-base text-white/65 font-light leading-relaxed">
            Track how much milk you buy every day — in millilitres and in money.
            Skip days, change quantities, set your own rate, and get a clean bill
            at the end of the month.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="milk-btn-primary rounded-full px-8 py-4 font-geist-mono text-sm tracking-wide inline-block"
            >
              {isAuthenticated ? 'Go to my ledger →' : 'Start tracking →'}
            </Link>
            <span className="font-mono-data text-[11px] text-white/40 tracking-widest uppercase">
              Free · Multi-user · Installable
            </span>
          </div>
        </section>

        {/* features */}
        <section className="px-5 sm:px-10 pb-24 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={f.title} className="liquid-glass rounded-2xl p-6 drip-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="font-mono-data text-[10px] tracking-[0.3em] text-[#f5eedc]/50 uppercase mb-3">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-geist-mono font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/55 text-sm font-light leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
          <p className="font-mono-data text-[10px] tracking-[0.25em] uppercase text-white/25 text-center mt-16">
            MilkTrack — pour, tap, pay.
          </p>
        </section>
      </main>
    </div>
  )
}
