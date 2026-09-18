import { AlertCircle } from 'lucide-react'

export function ErrorMessage({ error, onRetry, testId, retryTestId }: { error: unknown; onRetry?: () => void; testId?: string; retryTestId?: string }) {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  return <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" data-testid={testId} role="alert"><AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><div><div className="font-bold">Request failed</div><p className="mt-1 text-pretty text-sm leading-6" data-testid={testId ? `${testId}-details-body` : undefined}>{message}</p>{onRetry && <button className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold" data-testid={retryTestId} onClick={onRetry} type="button">Try again</button>}</div></div>
}
