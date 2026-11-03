import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from './Icons'

// Goes back in history when possible, otherwise to Home (e.g. when the page was opened directly).
export default function BackButton() {
  const navigate = useNavigate()
  const canGoBack = (window.history.state?.idx ?? 0) > 0

  return (
    <button
      type="button"
      onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
      className="-ml-2 self-start rounded-full p-2 text-ink hover:bg-slate-100"
      aria-label="Back"
    >
      <ArrowLeftIcon size={24} />
    </button>
  )
}
