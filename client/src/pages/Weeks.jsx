import { addWeeks, format, isSameDay, startOfToday } from 'date-fns'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { ChevronDownIcon, SearchIcon } from '../components/Icons'
import { EmptyState, ErrorState, Fab, TaskListSkeleton } from '../components/States'
import TaskRow from '../components/TaskRow'
import { useTaskSheet } from '../context/taskSheet'
import { useTaskList, useWeeks } from '../hooks/tasks'
import { byStatusThenTime, formatWeekRange, weekStartOf } from '../lib/dates'

/** "View All": one summary card per Monday–Sunday week; tap a card to expand its tasks. */
export default function Weeks() {
  const weeks = useWeeks()
  const sheet = useTaskSheet()
  const [currentWeek] = useState(() => weekStartOf(new Date()).toISOString())
  // null = default (only the current week expanded) until the user toggles something.
  const [expanded, setExpanded] = useState(null)

  const isExpanded = (key) => (expanded ? expanded.has(key) : key === currentWeek)
  const toggle = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev ?? [currentWeek])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <main className="flex flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-lg font-semibold">All Tasks</h1>
        <Link to="/search" className="-mr-2 rounded-full p-2 hover:bg-slate-100" aria-label="Search tasks">
          <SearchIcon size={22} />
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {weeks.isPending ? (
          Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[92px] animate-pulse bg-line/60" />)
        ) : weeks.isError ? (
          <ErrorState message={weeks.error.message} onRetry={weeks.refetch} />
        ) : weeks.data.length === 0 ? (
          <EmptyState title="No tasks yet" hint="Tap + to add your first task." />
        ) : (
          weeks.data.map((week) => (
            <WeekCard
              key={week.weekStart}
              week={week}
              isCurrent={week.weekStart === currentWeek}
              expanded={isExpanded(week.weekStart)}
              onToggle={() => toggle(week.weekStart)}
            />
          ))
        )}
      </div>

      <Fab onClick={() => sheet.openCreate(startOfToday())} />
    </main>
  )
}

function WeekCard({ week, isCurrent, expanded, onToggle }) {
  const start = new Date(week.weekStart)
  const percent = week.total ? Math.round((week.completed / week.total) * 100) : 0
  const panelId = `week-${week.weekStart}`

  return (
    <section className={`border bg-canvas ${isCurrent ? 'border-primary/50' : 'border-line'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full px-4 pt-3.5 pb-4 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            {formatWeekRange(start)}
            {isCurrent && <span className="bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">This week</span>}
          </h2>
          <ChevronDownIcon
            size={18}
            className={`shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
        <div className="mt-3 flex gap-2 text-xs">
          <span className="bg-pending px-2 py-1">
            Open <strong className="font-semibold tabular-nums">{week.open}</strong>
          </span>
          <span className="bg-complete px-2 py-1">
            Completed <strong className="font-semibold tabular-nums">{week.completed}</strong>
          </span>
        </div>
        <div className="mt-3 h-1.5 bg-lavender" aria-hidden="true">
          <div className="h-full bg-primary-dark transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-line px-4 pb-2">
          <WeekTasks start={start} />
        </div>
      )}
    </section>
  )
}

function WeekTasks({ start }) {
  const { data, isPending, isError, error, refetch } = useTaskList({ from: start, to: addWeeks(start, 1) })

  if (isPending) return <TaskListSkeleton rows={2} />
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />
  if (data.length === 0) return <EmptyState title="No tasks left this week" />

  const days = []
  for (const task of [...data].sort((a, b) => new Date(a.startAt) - new Date(b.startAt))) {
    const date = new Date(task.startAt)
    const last = days.at(-1)
    if (last && isSameDay(last.date, date)) last.tasks.push(task)
    else days.push({ date, tasks: [task] })
  }

  return days.map(({ date, tasks }) => (
    <div key={date.toISOString()} className="pt-3">
      <h3 className="text-[11px] font-medium tracking-wide text-muted uppercase">{format(date, 'EEEE, d MMM')}</h3>
      <ul>
        {tasks.sort(byStatusThenTime).map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>
    </div>
  ))
}
