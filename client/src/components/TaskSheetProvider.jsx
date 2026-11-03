import { useCallback, useMemo, useState } from 'react'
import { TaskSheetContext } from '../context/taskSheet'
import TaskSheet from './TaskSheet'

/**
 * Lets any screen open the shared bottom sheet:
 *   openCreate(date)  – "Add New Task" prefilled with a date
 *   openView(task)    – read-only details with edit/delete actions
 *   openEdit(task)    – edit form
 */
export default function TaskSheetProvider({ children }) {
  const [state, setState] = useState(null)

  const close = useCallback(() => setState(null), [])
  const value = useMemo(
    () => ({
      openCreate: (date) => setState({ mode: 'create', date, key: Date.now() }),
      openView: (task) => setState({ mode: 'view', task, key: Date.now() }),
      openEdit: (task) => setState({ mode: 'edit', task, key: Date.now() }),
      close,
    }),
    [close],
  )

  return (
    <TaskSheetContext.Provider value={value}>
      {children}
      {state && (
        <TaskSheet
          key={state.key}
          mode={state.mode}
          task={state.task}
          date={state.date}
          onClose={close}
          onEdit={value.openEdit}
        />
      )}
    </TaskSheetContext.Provider>
  )
}
