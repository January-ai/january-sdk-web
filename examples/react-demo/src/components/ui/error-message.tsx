import { AlertCircle } from 'lucide-react'

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  return <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert"><AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><div><div className="font-bold">Request failed</div><p className="mt-1 text-pretty text-sm leading-6">{message}</p></div></div>
}
