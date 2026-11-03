import { addWeeks, format, isSameDay, isToday, startOfToday } from 'date-fns'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SearchIcon } from '../components/Icons'
import { EmptyState, ErrorState, Fab, TaskListSkeleton } from '../components/States'
import TaskRow from '../components/TaskRow'
import { StatCards, WeeklyProgress } from '../components/WeekStats'
import WeekStrip from '../components/WeekStrip'
import { useTaskSheet } from '../context/taskSheet'
import { useTaskList, useWeekSummary } from '../hooks/tasks'
import { byStatusThenTime, fromDateKey, toDateKey, weekStartOf } from '../lib/dates'

export default function Home() {
  const [params, setParams] = useSearchParams()
  const sheet = useTaskSheet()

  // The selected day lives in the URL (?date=yyyy-MM-dd) so it survives navigation.
  const selected = fromDateKey(params.get('date')) ?? startOfToday()
  const setSelected = (day) => setParams(isToday(day) ? {} : { date: toDateKey(day) }, { replace: true })

  const weekStart = weekStartOf(selected)
  const weekTasks = useTaskList({ from: weekStart, to: addWeeks(weekStart, 1) })
  const summary = useWeekSummary(weekStart)

  // While a new week loads, the queries still hold the previous week's data (placeholderData);
  // treat that as loading instead of showing the wrong week's tasks and counts.
  const weekLoading = weekTasks.isPending || weekTasks.isPlaceholderData
  const summaryLoading = summary.isPending || summary.isPlaceholderData

  const { dayTasks, daysWithTasks } = useMemo(() => {
    if (weekLoading) return { dayTasks: [], daysWithTasks: undefined }
    const all = weekTasks.data ?? []
    return {
      dayTasks: all.filter((t) => isSameDay(new Date(t.startAt), selected)).sort(byStatusThenTime),
      daysWithTasks: new Set(all.map((t) => toDateKey(new Date(t.startAt)))),
    }
  }, [weekTasks.data, weekLoading, selected])

  const heading = isToday(selected) ? 'Tasks Today' : `Tasks on ${format(selected, 'EEE, d MMM')}`

  return (
    <main className="flex flex-1 flex-col px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-32">
      <Link
        to="/search"
        className="flex h-12 items-center justify-between border border-line bg-white px-4 text-sm text-muted transition-colors hover:border-primary/40"
      >
        Search for a task
        <SearchIcon size={20} className="text-ink" />
      </Link>

      <div className="mt-5">
        <WeekStrip selected={selected} onSelect={setSelected} daysWithTasks={daysWithTasks} />
      </div>

      <div className="mt-6">
        <StatCards
          completed={summary.data?.completed}
          open={summary.data?.open}
          loading={summaryLoading}
          error={summary.isError ? summary.error.message : null}
          onRetry={summary.refetch}
        />
      </div>

      <div className="mt-8">
        <WeeklyProgress percent={summaryLoading || summary.isError ? null : summary.data.progress} />
      </div>

      <section className="mt-8" aria-labelledby="day-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="day-heading" className="text-lg font-semibold">
            {heading}
          </h2>
          <Link to="/weeks" className="text-sm font-medium text-primary hover:underline">
            View All
          </Link>
        </div>

        <div className="mt-2">
          {weekTasks.isError ? (
            <ErrorState message={weekTasks.error.message} onRetry={weekTasks.refetch} />
          ) : weekLoading ? (
            <TaskListSkeleton />
          ) : dayTasks.length === 0 ? (
            <EmptyState
              title="Nothing planned"
              hint={`No tasks for ${isToday(selected) ? 'today' : format(selected, 'EEEE, d MMM')}.`}
              action={
                <button
                  type="button"
                  onClick={() => sheet.openCreate(selected)}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  + Add a task
                </button>
              }
            />
          ) : (
            <ul>
              {dayTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <Fab onClick={() => sheet.openCreate(selected)} />
    </main>
  )
}
