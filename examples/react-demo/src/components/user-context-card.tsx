import { UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUserSession } from './user-session'
import { Button, Card, SecondaryButton, SectionLabel, TextField } from './ui'

export function UserContextCard({ description }: { description: string }) {
  const session = useUserSession()
  const [userId, setUserId] = useState(session.endUserId)
  const [timezone, setTimezone] = useState(session.endUserTimezone)

  useEffect(() => {
    setUserId(session.endUserId)
    setTimezone(session.endUserTimezone)
  }, [session.endUserId, session.endUserTimezone])

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eee8dc]"><UserRound aria-hidden="true" className="size-5" /></div>
        <div><SectionLabel>Active partner user</SectionLabel><p className="mt-2 text-sm leading-6 text-stone-600">{description}</p></div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField label="Stable user ID" onChange={(event) => setUserId(event.target.value)} placeholder="partner-user-123" value={userId} />
        <TextField label="IANA timezone" onChange={(event) => setTimezone(event.target.value)} placeholder="America/New_York" value={timezone} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={!userId.trim()} onClick={() => session.setUser(userId, timezone)} type="button">Save active user</Button>
        {session.endUserId && <SecondaryButton onClick={session.clearUser} type="button"><X aria-hidden="true" className="size-4" />Clear user</SecondaryButton>}
      </div>
      {session.endUserId && <p className="mt-4 rounded-2xl bg-[#f8f5ed] px-4 py-3 text-sm font-semibold text-stone-700"><span className="break-all">{session.endUserId}</span> · {session.endUserTimezone}</p>}
    </Card>
  )
}
