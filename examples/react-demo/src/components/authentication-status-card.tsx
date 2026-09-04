import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import {
  getDemoConfiguration,
  refreshDemoClientToken,
  revokeAllDemoClientTokens,
} from '~/api/january.functions'
import { cn } from '~/lib/utils'
import { appBrand } from './app-brand'

export function AuthenticationStatusCard() {
  const queryClient = useQueryClient()
  const configuration = useQuery({
    queryKey: ['demo-configuration'],
    queryFn: () => getDemoConfiguration(),
    refetchInterval: 3_000,
  })
  const refresh = useMutation({
    mutationFn: () => refreshDemoClientToken(),
    onSuccess: (data) => queryClient.setQueryData(['demo-configuration'], data),
  })
  const revoke = useMutation({
    mutationFn: () => revokeAllDemoClientTokens(),
    onSuccess: (data) => queryClient.setQueryData(['demo-configuration'], data),
  })
  const data = configuration.data
  const actionError = refresh.error ?? revoke.error

  return (
    <section
      aria-label="Authentication status"
      className="overflow-hidden rounded-3xl border border-stone-300 bg-white/80 shadow-sm"
    >
      <div className="border-b border-stone-200 px-5 py-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-stone-500">
          {data?.authMode === 'client-token'
            ? <ShieldCheck aria-hidden="true" className="size-4" />
            : <KeyRound aria-hidden="true" className="size-4" />}
          {appBrand.environmentLabel}
        </div>
        <p className="mt-2 text-sm leading-5 text-stone-600">
          Requests run through the local TypeScript SDK on the server.
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        {configuration.isPending && <StatusLine tone="neutral" label="Checking authentication…" />}

        {data?.authMode === 'unconfigured' && (
          <>
            <StatusLine tone="warning" label="Authentication not configured" />
            <p className="text-xs leading-5 text-stone-600">
              Add a development API key or configure the local client-token relay in <code>.env.local</code>.
            </p>
          </>
        )}

        {data?.authMode === 'development-api-key' && (
          <>
            <StatusLine tone="warning" label="Development API key (sk-…)" />
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
              <div className="flex items-center gap-2 font-bold">
                <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                Local development only
              </div>
              <p className="mt-1.5">
                The key stays on this server. Never ship an <code>sk-…</code> key in a browser or production client.
              </p>
            </div>
          </>
        )}

        {data?.authMode === 'client-token' && (
          <>
            <StatusLine
              tone={data.relay.running === false ? 'warning' : 'positive'}
              label="Client token exchange (ct-…)"
            />

            <div className="space-y-2 rounded-2xl bg-stone-100/80 p-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-stone-600">Token relay</span>
                <span className="flex items-center gap-1.5 font-bold text-stone-900">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 rounded-full',
                      data.relay.running === false ? 'bg-amber-500' : 'bg-emerald-600',
                    )}
                  />
                  {data.relay.running === false
                    ? 'Offline'
                    : data.relay.local
                      ? 'Online'
                      : 'Managed endpoint'}
                </span>
              </div>
              {data.relay.displayUrl && (
                <p className="break-all font-mono text-[10px] leading-4 text-stone-500">
                  {data.relay.displayUrl}
                </p>
              )}
              <TokenState token={data.token} />
            </div>

            <p className="text-xs leading-5 text-stone-600">
              There is no stored refresh token. The SDK caches the short-lived client token and asks the relay to mint a new one before expiry or after an authentication failure.
            </p>

            {data.relay.running === false ? (
              <RelayInstructions />
            ) : data.relay.local ? (
              <div className="grid gap-2">
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-stone-950 px-3 text-xs font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={refresh.isPending || revoke.isPending}
                  onClick={() => refresh.mutate()}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" className={cn('size-3.5', refresh.isPending && 'animate-spin')} />
                  {refresh.isPending ? 'Minting…' : 'Mint fresh token'}
                </button>
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={refresh.isPending || revoke.isPending}
                  onClick={() => revoke.mutate()}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  {revoke.isPending ? 'Revoking…' : 'Revoke user tokens'}
                </button>
              </div>
            ) : null}

            {actionError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
                {errorMessage(actionError)}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function StatusLine({ tone, label }: { tone: 'positive' | 'warning' | 'neutral'; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 rounded-full',
          tone === 'positive' && 'bg-emerald-600',
          tone === 'warning' && 'bg-amber-500',
          tone === 'neutral' && 'bg-stone-400',
        )}
      />
      {label}
    </div>
  )
}

function TokenState({ token }: { token: Awaited<ReturnType<typeof getDemoConfiguration>>['token'] }) {
  if (token.status === 'ready') {
    return (
      <div className="border-t border-stone-200 pt-2 text-xs leading-5 text-stone-600">
        <strong className="text-stone-900">Token ready</strong>
        <span className="block">Expires {formatTime(token.expiresAt)}</span>
      </div>
    )
  }
  if (token.status === 'revoked') {
    return (
      <p className="border-t border-stone-200 pt-2 text-xs leading-5 text-stone-600">
        Revoked {token.revokedCount} token{token.revokedCount === 1 ? '' : 's'}. The next request will mint a new one.
      </p>
    )
  }
  if (token.status === 'error') {
    return <p className="border-t border-stone-200 pt-2 text-xs leading-5 text-red-700">{token.message}</p>
  }
  return <p className="border-t border-stone-200 pt-2 text-xs leading-5 text-stone-500">No client token minted in this server session yet.</p>
}

function RelayInstructions() {
  return (
    <div className="rounded-2xl border border-stone-300 bg-stone-950 p-3 text-stone-100">
      <div className="flex items-center gap-2 text-xs font-bold">
        <TerminalSquare aria-hidden="true" className="size-4" />
        Start the local servers
      </div>
      <div className="mt-2 space-y-2 font-mono text-[10px] leading-4 text-stone-300">
        <code className="block rounded-lg bg-white/10 p-2">npm run demo:token-server</code>
        <code className="block rounded-lg bg-white/10 p-2">npm run dev</code>
      </div>
    </div>
  )
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(value))
}

function errorMessage(error: Error) {
  return error.message || 'The token operation failed.'
}
