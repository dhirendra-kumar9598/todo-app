const KEY = 'todo:onboarded'

// localStorage can throw (private mode, blocked storage); fall back to "onboarded" so the app stays usable.
export const isOnboarded = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export const markOnboarded = () => {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // ignore
  }
}
