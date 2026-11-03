import { PRIORITY_OPTIONS } from '../lib/priority'

const STYLES = {
  low: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-danger',
}

export default function PriorityBadge({ priority, compact = false }) {
  if (!priority) return null
  const opt = PRIORITY_OPTIONS.find((o) => o.value === priority)
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1" title={`${opt.label} priority`}>
        <span className={`size-1.5 rounded-full ${opt.dot}`} aria-hidden="true" />
        {opt.label}
      </span>
    )
  }
  return <span className={`px-2 py-0.5 text-xs ${STYLES[priority]}`}>{opt.label} priority</span>
}
