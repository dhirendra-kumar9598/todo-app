import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { SearchIcon } from '../components/Icons'
import { EmptyState, ErrorState, TaskListSkeleton } from '../components/States'
import TaskRow from '../components/TaskRow'
import { useTaskSearch } from '../hooks/tasks'

const useDebounced = (value, delay) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')
  const query = useDebounced(text.trim(), 250)
  const results = useTaskSearch(query)

  // Keep ?q= in the URL so going back to this screen restores the search.
  useEffect(() => {
    if ((params.get('q') ?? '') !== query) setParams(query ? { q: query } : {}, { replace: true })
  }, [query, params, setParams])

  const tasks = results.data?.tasks ?? []
  const hasMore = results.data?.hasMore ?? false
  const stale = results.isPlaceholderData || text.trim() !== query

  return (
    <main className="flex flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
      <BackButton />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-5">
        <label className="flex h-12 items-center border border-line bg-white px-4 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
          <span className="sr-only">Search tasks</span>
          <input
            type="search"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search for a task"
            maxLength={100}
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          <SearchIcon size={20} />
        </label>
      </form>

      <div className="mt-4" aria-live="polite" aria-busy={results.isFetching}>
        {!query ? (
          <EmptyState title="Find a task" hint="Search by keywords in the title or description." />
        ) : results.isPending ? (
          <TaskListSkeleton />
        ) : results.isError ? (
          <ErrorState message={results.error.message} onRetry={results.refetch} />
        ) : tasks.length === 0 ? (
          <EmptyState title="No matching tasks" hint={`Nothing found for “${query}”.`} />
        ) : (
          <>
            <p className="mb-1 text-xs text-muted">
              {hasMore ? `First ${tasks.length} results` : `${tasks.length} ${tasks.length === 1 ? 'result' : 'results'}`}
            </p>
            <ul className={`transition-opacity ${stale ? 'opacity-60' : ''}`}>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} showDate />
              ))}
            </ul>
            {hasMore && (
              <p className="mt-4 text-center text-xs text-muted">
                More tasks match “{query}”. Try a more specific search.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
