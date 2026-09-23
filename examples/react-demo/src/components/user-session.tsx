import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const storageKey = 'january-partner-demo-user-context'

interface UserSessionValue {
  endUserId: string
  endUserTimezone: string
  ready: boolean
  setUser(endUserId: string, endUserTimezone: string): void
  clearUser(): void
}

const UserSessionContext = createContext<UserSessionValue | null>(null)

export function UserSessionProvider({ defaultEndUserId = '', children }: { defaultEndUserId?: string; children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [endUserId, setEndUserId] = useState(defaultEndUserId)
  const [endUserTimezone, setEndUserTimezone] = useState('UTC')

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as { endUserId?: string; endUserTimezone?: string } | null
      setEndUserId(stored?.endUserId?.trim() || defaultEndUserId)
      setEndUserTimezone(stored?.endUserTimezone?.trim() || timezone)
    } catch {
      setEndUserId(defaultEndUserId)
      setEndUserTimezone(timezone)
    }
    setReady(true)
  }, [defaultEndUserId])

  const value = useMemo<UserSessionValue>(() => ({
    endUserId,
    endUserTimezone,
    ready,
    setUser(userId, timezone) {
      const next = { endUserId: userId.trim(), endUserTimezone: timezone.trim() || 'UTC' }
      setEndUserId(next.endUserId)
      setEndUserTimezone(next.endUserTimezone)
      localStorage.setItem(storageKey, JSON.stringify(next))
    },
    clearUser() {
      setEndUserId('')
      localStorage.removeItem(storageKey)
    },
  }), [endUserId, endUserTimezone, ready])

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>
}

/**
 * A key that changes when one end user replaces another (or the user is cleared), for remounting a
 * screen whose state belongs to that user. The first user arriving is not a change: nothing was
 * loaded for "no user", and anything already typed on the screen is kept.
 */
export function useUserScopeKey(endUserId: string): number {
  const [scope, setScope] = useState({ user: endUserId, key: 0 })
  if (endUserId !== scope.user) {
    const next = { user: endUserId, key: scope.user ? scope.key + 1 : scope.key }
    setScope(next)
    return next.key
  }
  return scope.key
}

export function useUserSession() {
  const value = useContext(UserSessionContext)
  if (!value) throw new Error('useUserSession must be used inside UserSessionProvider')
  return value
}
