import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

/** show(message, { tone: 'default' | 'error', duration }) */
export const useToast = () => useContext(ToastContext)
