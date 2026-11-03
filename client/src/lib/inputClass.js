export const inputClass = (error) =>
  `h-12 w-full border bg-white px-3 text-sm text-ink placeholder:text-muted outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 ${
    error ? 'border-danger' : 'border-line'
  }`
