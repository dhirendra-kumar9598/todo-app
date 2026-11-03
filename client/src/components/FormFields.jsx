import { inputClass } from '../lib/inputClass'
import { CloseIcon } from './Icons'

export function Field({ label, htmlFor, error, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs text-ink/70">
        {label}
      </label>
      {children}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}

export const ErrorText = ({ children }) =>
  children ? <p className="mt-1.5 text-xs text-danger">{children}</p> : null

const openPicker = (e) => {
  try {
    e.currentTarget.showPicker?.()
  } catch {
    // showPicker can throw (e.g. inside cross-origin iframes); the native input still works.
  }
}

/**
 * Native date input (so every platform gets its OS date picker) laid transparently over
 * a custom display that matches the design ("Friday 14, January").
 */
export function DateInput({ name, label, placeholder, value, display, onChange, error, trailingIcon }) {
  return (
    <div className="relative">
      <input
        type="date"
        name={name}
        aria-label={label}
        aria-invalid={!!error}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <div
        className={`flex h-12 items-center gap-2.5 border bg-white px-3 text-sm transition-colors peer-focus-visible:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/15 ${
          error ? 'border-danger' : 'border-line'
        }`}
      >
        <span className="flex-1 truncate text-ink">{value ? display : placeholder}</span>
        {trailingIcon && <span className="text-ink/80">{trailingIcon}</span>}
      </div>
    </div>
  )
}

/**
 * Visible native time input. Unlike the date overlay this works in browsers without a time
 * picker popup (desktop Safari/Firefox), where the user types into the hour/minute fields.
 * While empty and unfocused it shows the design's "Start"/"Ends" label instead of "--:--".
 */
export function TimeInput({ name, label, placeholder, icon, value, onChange, onClear, error }) {
  return (
    <div className="relative">
      <input
        type="time"
        name={name}
        aria-label={label}
        aria-invalid={!!error}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className={`peer ${inputClass(error)} cursor-pointer pr-8 pl-9 [&::-webkit-calendar-picker-indicator]:hidden ${
          value ? '' : 'text-transparent focus:text-ink'
        }`}
      />
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink">{icon}</span>
      {!value && (
        <span className="pointer-events-none absolute top-1/2 left-9 -translate-y-1/2 text-sm text-ink/80 peer-focus:hidden">
          {placeholder}
        </span>
      )}
      {onClear && value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  )
}
