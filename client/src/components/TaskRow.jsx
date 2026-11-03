import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { useTaskSheet } from '../context/taskSheet'
import { useToast } from '../context/toast'
import { useDeleteTask, useUpdateTask } from '../hooks/tasks'
import { formatTimeRange } from '../lib/dates'
import { CheckIcon, EditIcon, TrashIcon } from './Icons'
import PriorityBadge from './PriorityBadge'

const ACTION_WIDTH = 88

/**
 * One task: checkbox, title, edit/delete icons. Swipe left (touch or mouse drag) or tap the
 * trash icon to reveal the "Delete" action; tap the title to view details.
 */
export default function TaskRow({ task, showDate = false }) {
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const sheet = useTaskSheet()
  const toast = useToast()

  const rowRef = useRef(null)
  const drag = useRef(null)
  const suppressClick = useRef(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const open = offset !== 0 && !dragging
  const done = task.status === 'completed'
  const start = new Date(task.startAt)

  const setOpen = (value) => setOffset(value ? -ACTION_WIDTH : 0)

  // Close the revealed action when interacting anywhere else.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !rowRef.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, base: offset, active: false }
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.active) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null // vertical scroll — let the browser handle it
        return
      }
      if (Math.abs(dx) < 8) return
      d.active = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setOffset(Math.min(0, Math.max(-ACTION_WIDTH * 1.4, d.base + dx)))
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    setDragging(false)
    suppressClick.current = true
    setTimeout(() => (suppressClick.current = false), 0)
    setOpen(offset < -ACTION_WIDTH / 2)
  }

  // Swallow the click that follows a drag, and use a tap on an open row to close it.
  const guard = (fn) => (e) => {
    if (suppressClick.current) return
    if (open) {
      setOpen(false)
      return
    }
    fn(e)
  }

  const toggle = () =>
    update.mutate(
      { task, changes: { status: done ? 'in_progress' : 'completed' } },
      { onError: (err) => toast(err.message, { tone: 'error' }) },
    )

  const handleDelete = () =>
    remove.mutate(task, {
      onSuccess: () => toast('Task deleted'),
      onError: (err) => toast(err.message, { tone: 'error' }),
    })

  return (
    <li ref={rowRef} className="relative overflow-hidden">
      <button
        type="button"
        onClick={handleDelete}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-danger text-sm font-medium text-white"
        style={{ width: ACTION_WIDTH }}
      >
        Delete
      </button>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative flex touch-pan-y items-center gap-3 bg-canvas select-none ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        }`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark "${task.title}" as ${done ? 'in progress' : 'completed'}`}
          onClick={guard(toggle)}
          className="-m-2 shrink-0 p-2"
        >
          <span
            className={`flex size-[18px] items-center justify-center border-[1.5px] border-primary transition-colors ${
              done ? 'bg-complete text-primary' : 'bg-white'
            }`}
          >
            {done && <CheckIcon size={13} strokeWidth={2.6} />}
          </span>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 border-b border-line py-4">
          <button
            type="button"
            onClick={guard(() => sheet.openView(task))}
            className="min-w-0 flex-1 text-left"
          >
            <span
              className={`block truncate text-sm font-medium ${done ? 'text-ink/80 line-through decoration-ink/70' : 'text-ink'}`}
            >
              {task.title}
            </span>
            <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
              <span>
                {showDate && `${format(start, 'EEE, d MMM')} · `}
                {formatTimeRange(start, task.endAt && new Date(task.endAt))}
              </span>
              <PriorityBadge priority={task.priority} compact />
            </span>
          </button>

          <button
            type="button"
            onClick={guard(() => setOpen(true))}
            className="rounded p-1.5 text-muted/80 transition-colors hover:bg-pending/60 hover:text-danger"
            aria-label={`Delete "${task.title}"`}
          >
            <TrashIcon size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={guard(() => sheet.openEdit(task))}
            className="-mr-1.5 rounded p-1.5 text-muted/80 transition-colors hover:bg-complete hover:text-primary"
            aria-label={`Edit "${task.title}"`}
          >
            <EditIcon size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </li>
  )
}
