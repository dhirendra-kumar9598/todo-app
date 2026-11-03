import { useLocation, useNavigate } from 'react-router-dom'
import { markOnboarded } from '../lib/onboarding'

const Zigzag = ({ className }) => (
  <svg viewBox="0 0 96 64" fill="none" stroke="currentColor" strokeWidth="5" className={className} aria-hidden="true">
    {[8, 24, 40, 56].map((y) => (
      <path key={y} d={`M0 ${y} l12 -10 l12 10 l12 -10 l12 10 l12 -10 l12 10 l12 -10 l12 10`} />
    ))}
  </svg>
)

export default function Onboarding() {
  const navigate = useNavigate()
  const from = useLocation().state?.from

  const start = () => {
    markOnboarded()
    // Continue to the page the visitor originally opened (e.g. a shared /search link).
    navigate(from ? `${from.pathname}${from.search}` : '/', { replace: true })
  }

  return (
    <main className="flex flex-1 flex-col bg-white">
      <div className="relative min-h-[300px] flex-[1.6] overflow-hidden bg-primary">
        <div className="absolute -top-14 -right-12 size-36 rounded-full border-[22px] border-white/15" />
        <Zigzag className="absolute top-[18%] left-0 w-24 text-white/20" />
        <Zigzag className="absolute right-0 bottom-[8%] w-24 text-white/20" />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h1 className="text-[22px] font-semibold">Manage What To Do</h1>
        <p className="mt-4 max-w-[17rem] text-xs leading-relaxed text-ink/70">
          The best way to manage what you have to do, don’t forget your plans
        </p>
        <button
          type="button"
          onClick={start}
          className="mt-auto h-12 w-full bg-primary text-[15px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Get Started
        </button>
      </div>
    </main>
  )
}
