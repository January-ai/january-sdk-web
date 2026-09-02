import { Check, LoaderCircle, Mic, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  VoiceCaptureError,
  VoiceCaptureSession,
  type VoiceCaptureSnapshot,
} from '@januaryai/web-sdk'

interface VoiceSearchInputProps {
  disabled?: boolean
  id: string
  onChange(value: string): void
  placeholder: string
  value: string
}

export function VoiceSearchInput({ disabled = false, id, onChange, placeholder, value }: VoiceSearchInputProps) {
  const session = useMemo(() => new VoiceCaptureSession(), [])
  const [snapshot, setSnapshot] = useState<VoiceCaptureSnapshot>(session.snapshot)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const unsubscribe = session.subscribe(setSnapshot)
    return () => {
      unsubscribe()
      session.dispose()
    }
  }, [session])
  useEffect(() => {
    if (disabled && snapshot.state !== 'idle') session.cancel()
  }, [disabled, session, snapshot.state])

  async function toggleCapture() {
    setError(null)
    try {
      if (snapshot.state === 'recording') {
        const result = await session.stop()
        const transcript = result.transcript?.trim()
        if (transcript) onChange([value.trim(), transcript].filter(Boolean).join(' '))
        else setError('We could not transcribe that recording. Please try again.')
      } else if (snapshot.state === 'idle') {
        await session.start({ language: document.documentElement.lang || navigator.language })
      }
    } catch (cause) {
      if (cause instanceof VoiceCaptureError && cause.code === 'cancelled') return
      setError(messageForError(cause))
    }
  }

  function cancelCapture() {
    session.cancel()
    setError(null)
  }

  const busy = snapshot.state === 'requestingPermission' || snapshot.state === 'processing'
  const recording = snapshot.state === 'recording'
  const voiceSupported = mounted && session.isSupported && session.isTranscriptionSupported
  const micDisabled = disabled || busy || !voiceSupported

  return (
    <div>
      <div
        className={`flex min-h-14 min-w-0 items-center gap-3 rounded-2xl px-3 transition-colors ${recording ? 'bg-stone-950 text-white shadow-lg shadow-stone-900/10' : 'border border-stone-300 bg-white focus-within:bg-stone-50'}`}
      >
        <input
          className={recording || busy ? 'sr-only' : 'min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-stone-400'}
          disabled={recording || busy}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          tabIndex={recording || busy ? -1 : undefined}
          value={value}
        />
        {recording ? (
          <>
            <button aria-label="Cancel voice capture" className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 text-stone-300 transition-colors hover:bg-white/10 hover:text-white" onClick={cancelCapture} type="button">
              <X aria-hidden="true" className="size-4" />
            </button>
            <VoiceWaveform level={snapshot.audioLevel} />
            <span className="data-number min-w-10 text-right text-xs font-bold text-stone-300">{formatDuration(snapshot.durationMs)}</span>
            <button aria-label="Stop voice capture" className="grid size-9 shrink-0 place-items-center rounded-full bg-lime-300 text-stone-950 transition-colors hover:bg-lime-200" onClick={() => void toggleCapture()} title="Finish and transcribe" type="button">
              <Check aria-hidden="true" className="size-4 stroke-[2.5]" />
            </button>
          </>
        ) : busy ? (
          <>
            <LoaderCircle aria-hidden="true" className="ml-1 size-4 animate-spin text-stone-500 motion-reduce:animate-none" />
            <span className="min-w-0 flex-1 text-sm text-stone-500">{snapshot.state === 'requestingPermission' ? 'Waiting for microphone access…' : 'Transcribing…'}</span>
            <button aria-label="Cancel voice capture" className="grid size-9 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100" onClick={cancelCapture} type="button">
              <X aria-hidden="true" className="size-4" />
            </button>
          </>
        ) : (
          <>
            <button
              aria-label="Start voice capture"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={micDisabled}
              onClick={() => void toggleCapture()}
              title={mounted && !session.isSupported ? 'Voice capture is not supported in this browser' : 'Search with your voice'}
              type="button"
            >
              <Mic aria-hidden="true" className="size-4" />
            </button>
          </>
        )}
      </div>

      {error ? <p aria-live="polite" className="mt-2 text-pretty text-sm text-red-700">{error}</p> : null}
      {mounted && !session.isSupported ? <p className="mt-2 text-sm text-stone-500">Voice capture needs a browser with microphone recording support.</p> : null}
      {mounted && session.isSupported && !session.isTranscriptionSupported ? <p className="mt-2 text-sm text-stone-500">Voice search needs browser speech-recognition support. You can still type your query.</p> : null}
    </div>
  )
}

function VoiceWaveform({ level }: { level: number }) {
  const bars = [0.44, 0.72, 1, 0.64, 0.86, 0.52, 0.94, 0.6, 0.78]
  return (
    <div aria-hidden="true" className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden">
      {bars.map((weight, index) => (
        <span
          className="w-1 rounded-full bg-amber-300 transition-[height] duration-100"
          key={index}
          style={{ height: `${Math.max(4, 4 + level * 22 * weight)}px` }}
        />
      ))}
    </div>
  )
}

function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.floor(durationMs / 1_000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function messageForError(error: unknown): string {
  if (error instanceof VoiceCaptureError) {
    if (error.code === 'permissionDenied') return 'Allow microphone access in your browser to search by voice.'
    if (error.code === 'microphoneUnavailable') return 'No available microphone was found.'
    if (error.code === 'unsupported') return 'Voice capture is not supported in this browser.'
  }
  return 'Voice capture could not start. Check your microphone and try again.'
}
