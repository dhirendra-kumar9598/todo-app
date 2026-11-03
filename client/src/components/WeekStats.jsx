import { BoxCheckIcon, BoxCrossIcon } from './Icons'

export function StatCards({ completed, open, loading, error, onRetry }) {
  if (error) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 border border-pending-icon bg-pending px-4 py-4">
        <div>
          <p className="text-sm font-medium text-danger">Couldn’t load this week’s stats</p>
          <p className="mt-0.5 text-xs text-muted">{error}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 border border-danger/40 bg-white px-3 py-1.5 text-xs font-medium text-danger hover:border-danger"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3.5" aria-busy={loading}>
      <StatCard
        label="Task Complete"
        value={completed}
        loading={loading}
        className="bg-complete"
        iconClass="bg-complete-icon text-primary-dark"
        icon={<BoxCheckIcon size={20} strokeWidth={1.6} />}
      />
      <StatCard
        label="Task Pending"
        value={open}
        loading={loading}
        className="bg-pending"
        iconClass="bg-pending-icon text-danger"
        icon={<BoxCrossIcon size={20} strokeWidth={1.6} />}
      />
    </div>
  )
}

function StatCard({ label, value, loading, className, iconClass, icon }) {
  return (
    <div className={`px-3.5 py-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex size-8 shrink-0 items-center justify-center ${iconClass}`}>{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 flex items-baseline gap-1.5 pl-[42px]">
        <span className="text-2xl font-semibold tabular-nums">
          {loading ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-white/70 align-middle" /> : String(value ?? 0).padStart(2, '0')}
        </span>
        <span className="text-[10px] text-muted">This Week</span>
      </p>
    </div>
  )
}

// `percent` is null while unknown (loading or failed).
export function WeeklyProgress({ percent }) {
  const known = percent != null
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Weekly Progress</h2>
        <span className="text-xs text-muted tabular-nums">{known ? `${percent}%` : '–'}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={known ? percent : undefined}
        aria-label="Tasks completed this week"
        className={`h-5 w-full bg-lavender ${known ? '' : 'animate-pulse'}`}
      >
        <div className="h-full bg-primary-dark transition-[width] duration-500" style={{ width: `${known ? percent : 0}%` }} />
      </div>
    </section>
  )
}
