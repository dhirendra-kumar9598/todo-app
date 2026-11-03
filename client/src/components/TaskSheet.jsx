import { addDays, format } from 'date-fns'
import { useEffect, useId, useRef, useState } from 'react'
import { useToast } from '../context/toast'
import { useCreateTask, useDeleteTask, useUpdateTask } from '../hooks/tasks'
import { combineDateTime, formatTimeRange, fromDateKey, toDateKey, toTimeKey } from '../lib/dates'
import { PRIORITY_OPTIONS } from '../lib/priority'
import { inputClass } from '../lib/inputClass'
import { DateInput, ErrorText, Field, TimeInput } from './FormFields'
import { CalendarIcon, ClockIcon, CloseIcon } from './Icons'
import PriorityBadge from './PriorityBadge'

const initialForm = (task, date) => {
  if (!task) {
    return { title: '', date: toDateKey(date ?? new Date()), start: '', end: '', priority: null, description: '' }
  }
  const start = new Date(task.startAt)
  return {
    title: task.title,
    date: toDateKey(start),
    start: toTimeKey(start),
    end: task.endAt ? toTimeKey(new Date(task.endAt)) : '',
    priority: task.priority,
    description: task.description ?? '',
  }
}

// An end time earlier than the start means the task runs past midnight.
const endsNextDay = (form) => Boolean(form.start && form.end && form.end < form.start)

const validate = (form) => {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Please enter a task title'
  if (!fromDateKey(form.date)) errors.date = 'Please pick a date'
  if (!form.start) errors.start = 'Pick a start time'
  if (form.start && form.end === form.start) errors.end = 'Must differ from start'
  return errors
}

// Server field names → form field names.
const SERVER_FIELDS = { title: 'title', startAt: 'start', endAt: 'end', description: 'description' }

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, [tabindex]:not([tabindex="-1"])'

export default function TaskSheet({ mode, task, date, onClose, onEdit }) {
  const titleId = useId()
  const sheetRef = useRef(null)

  // Escape closes, Tab stays inside the sheet, page behind doesn't scroll,
  // and focus returns to whatever opened the sheet.
  useEffect(() => {
    const opener = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !sheetRef.current) return
      const nodes = [...sheetRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length)
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes.at(-1)
      const inside = sheetRef.current.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      // Only when focus was lost with the sheet (not when e.g. the edit sheet already took it).
      const lost = !document.activeElement || document.activeElement === document.body
      if (lost && opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [onClose])

  useEffect(() => {
    if (mode === 'view') sheetRef.current?.focus()
  }, [mode])

  const heading = { create: 'Add New Task', edit: 'Edit Task', view: 'Task Details' }[mode]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-sheet-in relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl outline-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <header className="flex items-center justify-between px-6 pt-4 pb-2">
          <h2 id={titleId} className="text-lg font-medium">
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-full p-2 text-ink hover:bg-slate-100"
            aria-label="Close"
          >
            <CloseIcon size={20} />
          </button>
        </header>
        {mode === 'view' ? (
          <TaskDetails task={task} onClose={onClose} onEdit={() => onEdit(task)} />
        ) : (
          <TaskForm task={mode === 'edit' ? task : null} date={date} onClose={onClose} />
        )}
      </div>
    </div>
  )
}

function TaskForm({ task, date, onClose }) {
  const [form, setForm] = useState(() => initialForm(task, date))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const create = useCreateTask()
  const update = useUpdateTask()
  const toast = useToast()
  const saving = create.isPending || update.isPending

  const set = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      e.currentTarget.querySelector(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }

    const endDate = endsNextDay(form) ? toDateKey(addDays(fromDateKey(form.date), 1)) : form.date
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      startAt: combineDateTime(form.date, form.start).toISOString(),
      endAt: form.end ? combineDateTime(endDate, form.end).toISOString() : null,
      priority: form.priority,
    }

    setSubmitError('')
    try {
      if (task) {
        await update.mutateAsync({ task, changes: body })
        toast('Changes saved')
      } else {
        await create.mutateAsync(body)
        toast('Task created')
      }
      onClose()
    } catch (err) {
      const fieldErrors = {}
      err.details?.forEach((d) => {
        if (SERVER_FIELDS[d.field]) fieldErrors[SERVER_FIELDS[d.field]] = d.message
      })
      setErrors(fieldErrors)
      setSubmitError(err.message)
    }
  }

  const selectedDate = fromDateKey(form.date)

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 pt-3 pb-4">
        <Field label="Task title" error={errors.title} htmlFor="task-title">
          <input
            id="task-title"
            name="title"
            autoFocus
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
            maxLength={120}
            placeholder="e.g. Doing Homework"
            aria-invalid={!!errors.title}
            className={inputClass(errors.title)}
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-xs text-ink/70">Set Time</legend>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <TimeInput
                name="start"
                label="Start time"
                placeholder="Start"
                icon={<ClockIcon size={16} />}
                value={form.start}
                onChange={set('start')}
                error={errors.start}
              />
              <ErrorText>{errors.start}</ErrorText>
            </div>
            <div>
              <TimeInput
                name="end"
                label="End time (optional)"
                placeholder="Ends"
                icon={<ClockIcon size={16} />}
                value={form.end}
                onChange={set('end')}
                onClear={() => set('end')('')}
                error={errors.end}
              />
              <ErrorText>{errors.end}</ErrorText>
              {!errors.end && endsNextDay(form) && <p className="mt-1.5 text-xs text-muted">Ends the next day</p>}
            </div>
          </div>
        </fieldset>

        <Field label="Set Date" error={errors.date}>
          <DateInput
            name="date"
            label="Date"
            placeholder="Pick a date"
            trailingIcon={<CalendarIcon size={18} />}
            value={form.date}
            display={selectedDate && format(selectedDate, 'EEEE d, MMMM')}
            onChange={set('date')}
            error={errors.date}
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-xs text-ink/70">Priority</legend>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Priority">
            {PRIORITY_OPTIONS.map((opt) => {
              const active = form.priority === opt.value
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set('priority')(opt.value)}
                  className={`flex h-10 items-center justify-center gap-1.5 border text-xs transition-colors ${
                    active ? 'border-primary bg-complete text-primary' : 'border-line text-ink/80 hover:border-primary/40'
                  }`}
                >
                  {opt.dot && <span className={`size-2 rounded-full ${opt.dot}`} aria-hidden="true" />}
                  {opt.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <Field label="Description" htmlFor="task-description">
          <textarea
            id="task-description"
            name="description"
            rows={4}
            maxLength={2000}
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            placeholder="Add Description"
            className={`${inputClass()} h-auto resize-none py-3`}
          />
        </Field>
      </div>

      <div className="border-t border-line/60 px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {submitError && (
          <p role="alert" className="mb-3 text-sm text-danger">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="h-12 w-full bg-primary text-[15px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  )
}

function TaskDetails({ task, onClose, onEdit }) {
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [status, setStatus] = useState(task.status)
  const start = new Date(task.startAt)
  const done = status === 'completed'

  const toggle = () => {
    const next = done ? 'in_progress' : 'completed'
    setStatus(next)
    update.mutate(
      { task, changes: { status: next } },
      {
        onError: (err) => {
          setStatus(task.status)
          toast(err.message, { tone: 'error' })
        },
      },
    )
  }

  const handleDelete = () => {
    if (!confirming) return setConfirming(true)
    remove.mutate(task, {
      onSuccess: () => toast('Task deleted'),
      onError: (err) => toast(err.message, { tone: 'error' }),
    })
    onClose()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 pt-2 pb-4">
        <div>
          <p className={`text-lg font-medium break-words ${done ? 'text-muted line-through' : ''}`}>{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-0.5 text-xs ${done ? 'bg-complete text-primary' : 'bg-pending text-danger'}`}
            >
              {done ? 'Completed' : 'In Progress'}
            </span>
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 text-sm">
          <dt className="text-muted">
            <CalendarIcon size={18} />
            <span className="sr-only">Date</span>
          </dt>
          <dd>{format(start, 'EEEE, d MMMM yyyy')}</dd>
          <dt className="text-muted">
            <ClockIcon size={18} />
            <span className="sr-only">Time</span>
          </dt>
          <dd>{formatTimeRange(start, task.endAt && new Date(task.endAt))}</dd>
        </dl>

        <div>
          <h3 className="mb-1 text-xs text-ink/70">Description</h3>
          <p className="text-sm whitespace-pre-wrap text-ink/90">
            {task.description || <span className="text-muted">No description</span>}
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t border-line/60 px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={toggle}
          className="h-12 w-full bg-primary text-[15px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {done ? 'Mark as In Progress' : 'Mark as Completed'}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="h-11 border border-line text-sm font-medium hover:border-primary/50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            onBlur={() => setConfirming(false)}
            className={`h-11 border text-sm font-medium transition-colors ${
              confirming ? 'border-danger bg-danger text-white' : 'border-line text-danger hover:border-danger/50'
            }`}
          >
            {confirming ? 'Tap to confirm' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
