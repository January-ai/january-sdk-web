import { UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUserSession } from './user-session'
import { Button, Card, SecondaryButton, SectionLabel, TextField } from './ui'

export function UserContextCard({ description }: { description: string }) {
  const session = useUserSession()
  const [userId, setUserId] = useState(session.endUserId)
  const [timezone, setTimezone] = useState(session.endUserTimezone)
  // Once someone types, the fields are theirs: the default user arriving with
  // the demo's configuration must not overwrite what they entered.
  const [edited, setEdited] = useState(false)

  useEffect(() => {
    if (edited) return
    setUserId(session.endUserId)
    setTimezone(session.endUserTimezone)
  }, [edited, session.endUserId, session.endUserTimezone])

  return (
    <Card className="p-5 sm:p-6" data-testid="food-log-user-card">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eee8dc]"><UserRound aria-hidden="true" className="size-5" /></div>
        <div><SectionLabel>Active partner user</SectionLabel><p className="mt-2 text-sm leading-6 text-stone-600">{description}</p></div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField data-testid="settings-user-input" label="Stable user ID" onChange={(event) => { setEdited(true); setUserId(event.target.value) }} placeholder="partner-user-123" value={userId} />
        <TextField data-testid="settings-timezone-input" label="IANA timezone" onChange={(event) => { setEdited(true); setTimezone(event.target.value) }} placeholder="America/New_York" value={timezone} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button data-testid="settings-save" disabled={!userId.trim()} onClick={() => { session.setUser(userId, timezone); setEdited(false) }} type="button">Save active user</Button>
        {session.endUserId && <SecondaryButton data-testid="settings-clear" onClick={() => { session.clearUser(); setEdited(false) }} type="button"><X aria-hidden="true" className="size-4" />Clear user</SecondaryButton>}
      </div>
      {session.endUserId && <p className="mt-4 rounded-2xl bg-[#f8f5ed] px-4 py-3 text-sm font-semibold text-stone-700" data-testid="settings-user-id"><span className="break-all">{session.endUserId}</span> · {session.endUserTimezone}</p>}
    </Card>
  )
}
