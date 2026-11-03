import { addDays, format, isSameDay, isSameMonth, isSameYear, isValid, parseISO, startOfWeek } from 'date-fns'

export const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

// Weeks run Monday → Sunday.
export const weekStartOf = (date) => startOfWeek(date, { weekStartsOn: 1 })
export const weekDays = (weekStart) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

// yyyy-MM-dd <-> Date (local time), used for URL params and <input type="date">.
export const toDateKey = (date) => format(date, 'yyyy-MM-dd')
export const fromDateKey = (key) => {
  const date = key ? parseISO(key) : null
  return date && isValid(date) ? date : null
}

// yyyy-MM-dd + HH:mm (local) -> Date
export const combineDateTime = (dateKey, time) => new Date(`${dateKey}T${time}`)
export const toTimeKey = (date) => format(date, 'HH:mm')

export const formatTime = (date) => format(date, 'h:mm a')

// "10:00 PM – 2:00 AM (+1 day)"
export const formatTimeRange = (start, end) => {
  if (!end) return formatTime(start)
  return `${formatTime(start)} – ${formatTime(end)}${isSameDay(start, end) ? '' : ' (+1 day)'}`
}

export const formatWeekRange = (weekStart) => {
  const end = addDays(weekStart, 6)
  if (isSameMonth(weekStart, end)) return `${format(weekStart, 'd')} – ${format(end, 'd MMM yyyy')}`
  if (isSameYear(weekStart, end)) return `${format(weekStart, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
  return `${format(weekStart, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
}

// Sort helper: open tasks first, then by start time.
export const byStatusThenTime = (a, b) =>
  (a.status === 'completed') - (b.status === 'completed') || new Date(a.startAt) - new Date(b.startAt)
