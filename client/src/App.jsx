import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isOnboarded } from './lib/onboarding'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import Search from './pages/Search'
import Weeks from './pages/Weeks'

// Remembers where a first-time visitor was going so onboarding can send them there after.
function RequireOnboarding({ children }) {
  const location = useLocation()
  return isOnboarded() ? children : <Navigate to="/welcome" replace state={{ from: location }} />
}

export default function App() {
  return (
    // Phone-width column; centred with a soft shadow on larger screens.
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-canvas md:shadow-[0_0_48px_rgba(15,23,42,0.08)]">
      <Routes>
        <Route path="/welcome" element={<Onboarding />} />
        <Route path="/" element={<RequireOnboarding><Home /></RequireOnboarding>} />
        <Route path="/search" element={<RequireOnboarding><Search /></RequireOnboarding>} />
        <Route path="/weeks" element={<RequireOnboarding><Weeks /></RequireOnboarding>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
