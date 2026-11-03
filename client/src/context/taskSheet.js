import { createContext, useContext } from 'react'

export const TaskSheetContext = createContext(null)

/** { openCreate(date), openView(task), openEdit(task), close() } */
export const useTaskSheet = () => useContext(TaskSheetContext)
