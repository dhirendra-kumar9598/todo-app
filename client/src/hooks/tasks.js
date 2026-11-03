import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export const taskKeys = {
  all: ['tasks'],
  lists: ['tasks', 'list'],
  list: (params) => ['tasks', 'list', params],
  searches: ['tasks', 'search'],
  search: (q) => ['tasks', 'search', q],
  summaries: ['tasks', 'summary'],
  summary: (date) => ['tasks', 'summary', date],
  weeks: () => ['tasks', 'weeks'],
}

export const useTaskList = ({ from, to }, options) =>
  useQuery({
    queryKey: taskKeys.list({ from: from?.toISOString(), to: to?.toISOString() }),
    queryFn: ({ signal }) => api.listTasks({ from, to }, signal),
    placeholderData: keepPreviousData,
    ...options,
  })

export const useWeekSummary = (weekStart) =>
  useQuery({
    queryKey: taskKeys.summary(weekStart.toISOString()),
    queryFn: ({ signal }) => api.weekSummary(weekStart, signal),
    placeholderData: keepPreviousData,
  })

export const useWeeks = () =>
  useQuery({ queryKey: taskKeys.weeks(), queryFn: ({ signal }) => api.listWeeks(signal) })

// data: { tasks, hasMore }
export const useTaskSearch = (q) =>
  useQuery({
    queryKey: taskKeys.search(q),
    queryFn: ({ signal }) => api.searchTasks(q, signal),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  })

/** Applies `fn(tasks)` to every cached task list and search result. */
function updateTaskCaches(qc, fn) {
  qc.setQueriesData({ queryKey: taskKeys.lists }, (old) => old && fn(old))
  qc.setQueriesData({ queryKey: taskKeys.searches }, (old) => old && { ...old, tasks: fn(old.tasks) })
}

/** Latest cached copy of a task (the caller's copy may be stale). */
function findCachedTask(qc, id) {
  for (const [, data] of qc.getQueriesData({ queryKey: taskKeys.lists })) {
    const hit = data?.find((t) => t.id === id)
    if (hit) return hit
  }
  return null
}

const inWeek = (task, bucket) => {
  if (!task) return false
  const t = new Date(task.startAt)
  return t >= new Date(bucket.weekStart) && t < new Date(bucket.weekEnd)
}

/** Moves one task's contribution in week counts from `before` to `after` (either may be null). */
function shiftCounts(bucket, before, after) {
  let { total, completed } = bucket
  if (inWeek(before, bucket)) {
    total -= 1
    if (before.status === 'completed') completed -= 1
  }
  if (inWeek(after, bucket)) {
    total += 1
    if (after.status === 'completed') completed += 1
  }
  return { ...bucket, total, completed, open: total - completed }
}

/** Keeps the summary cards and "View All" week cards in step with an optimistic change. */
function updateCounts(qc, before, after) {
  qc.setQueriesData({ queryKey: taskKeys.summaries }, (old) => {
    if (!old) return old
    const next = shiftCounts(old, before, after)
    return { ...next, progress: next.total ? Math.round((next.completed / next.total) * 100) : 0 }
  })
  qc.setQueriesData({ queryKey: taskKeys.weeks() }, (old) =>
    old?.map((w) => shiftCounts(w, before, after)).filter((w) => w.total > 0),
  )
}

/**
 * Runs `optimistic(qc, vars)` right away, rolls every task cache back on error, and refetches
 * everything once the server answers.
 */
function useTaskMutation(mutationFn, optimistic) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: async (vars) => {
      if (!optimistic) return undefined
      await qc.cancelQueries({ queryKey: taskKeys.all })
      const snapshot = qc.getQueriesData({ queryKey: taskKeys.all })
      optimistic(qc, vars)
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  })
}

export const useCreateTask = () => useTaskMutation((body) => api.createTask(body))

// vars: { task, changes }
export const useUpdateTask = () =>
  useTaskMutation(
    ({ task, changes }) => api.updateTask(task.id, changes),
    (qc, { task, changes }) => {
      const before = findCachedTask(qc, task.id) ?? task
      updateTaskCaches(qc, (list) => list.map((t) => (t.id === task.id ? { ...t, ...changes } : t)))
      updateCounts(qc, before, { ...before, ...changes })
    },
  )

// vars: task
export const useDeleteTask = () =>
  useTaskMutation(
    (task) => api.deleteTask(task.id),
    (qc, task) => {
      const before = findCachedTask(qc, task.id) ?? task
      updateTaskCaches(qc, (list) => list.filter((t) => t.id !== task.id))
      updateCounts(qc, before, null)
    },
  )
