import { PlusIcon } from './Icons'

export function TaskListSkeleton({ rows = 3 }) {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="size-[18px] shrink-0 animate-pulse bg-line" />
          <div className="flex-1 border-b border-line py-4">
            <span className="block h-3.5 w-2/3 animate-pulse rounded bg-line" />
            <span className="mt-2 block h-2.5 w-1/4 animate-pulse rounded bg-line/70" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-10 text-center">
      <p className="text-sm font-medium text-danger">Couldn’t load tasks</p>
      <p className="mt-1 text-xs text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 border border-line px-4 py-2 text-xs font-medium hover:border-primary/50"
      >
        Try again
      </button>
    </div>
  )
}

export function Fab({ onClick, label = 'Add task' }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md justify-center pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="pointer-events-auto flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(61,92,232,0.35)] transition-transform hover:bg-primary-hover active:scale-95"
      >
        <PlusIcon size={30} strokeWidth={1.6} />
      </button>
    </div>
  )
}
