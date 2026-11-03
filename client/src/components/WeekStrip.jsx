import { addDays, addWeeks, format, isSameDay, isToday } from 'date-fns'
import { useRef } from 'react'
import { toDateKey, weekDays, weekStartOf } from '../lib/dates'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

/**
 * Monday–Sunday day picker. Swipe horizontally or use the chevrons to change week,
 * arrow keys to move between days.
 */
export default function WeekStrip({ selected, onSelect, daysWithTasks }) {
  const weekStart = weekStartOf(selected)
  const days = weekDays(weekStart)
  const swipe = useRef(null)
  const showToday = !isToday(selected)

  const shiftWeek = (n) => onSelect(addWeeks(selected, n))

  const onKeyDown = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key]
    if (!step) return
    e.preventDefault()
    onSelect(addDays(selected, step))
  }

  return (
    <section aria-label="Choose a day">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium" aria-live="polite">
          {format(weekStart, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          {showToday && (
            <button
              type="button"
              onClick={() => onSelect(new Date())}
              className="mr-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-complete"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded p-1 text-muted hover:bg-slate-100 hover:text-ink"
            aria-label="Previous week"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded p-1 text-muted hover:bg-slate-100 hover:text-ink"
            aria-label="Next week"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>

      <div
        role="listbox"
        aria-label={`Week of ${format(weekStart, 'd MMMM')}`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = swipe.current
          swipe.current = null
          if (!s) return
          const dx = e.clientX - s.x
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) shiftWeek(dx < 0 ? 1 : -1)
        }}
        className="grid touch-pan-y grid-cols-7 gap-1"
      >
        {days.map((day) => {
          const active = isSameDay(day, selected)
          const today = isToday(day)
          const hasTasks = daysWithTasks?.has(toDateKey(day))
          return (
            <button
              key={day.toISOString()}
              type="button"
              role="option"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              aria-label={`${format(day, 'EEEE d MMMM')}${today ? ', today' : ''}${hasTasks ? ', has tasks' : ''}`}
              onClick={() => onSelect(day)}
              className={`flex h-[54px] flex-col items-center justify-center rounded-sm transition-colors ${
                active ? 'bg-primary text-white' : 'hover:bg-complete'
              }`}
            >
              <span className={`text-[10px] ${active ? 'text-white/90' : 'text-muted'}`}>{format(day, 'EEE')}</span>
              <span
                className={`text-[15px] leading-6 ${
                  active ? 'font-medium' : today ? 'font-semibold text-primary' : 'text-muted'
                }`}
              >
                {format(day, 'dd')}
              </span>
              <span
                className={`size-1 rounded-full ${hasTasks ? (active ? 'bg-white' : 'bg-primary/70') : 'bg-transparent'}`}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}
