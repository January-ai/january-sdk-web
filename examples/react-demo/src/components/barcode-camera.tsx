import { Barcode, Camera, CameraOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SecondaryButton } from './ui'

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
interface BarcodeDetectorConstructor { new(options?: { formats?: string[] }): BarcodeDetectorLike }

export function BarcodeCamera({ onDetected }: { onDetected(value: string): void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const frame = useRef<number | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && 'BarcodeDetector' in globalThis)
    return stop
  }, [])

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    setActive(false)
  }

  async function start() {
    setError('')
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      stream.current = media
      if (!video.current) return
      video.current.srcObject = media
      await video.current.play()
      setActive(true)
      const Detector = (globalThis as typeof globalThis & { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
      const scan = async () => {
        if (!video.current || !stream.current) return
        try {
          const matches = await detector.detect(video.current)
          const value = matches[0]?.rawValue.replace(/\D/g, '')
          if (value) {
            onDetected(value)
            stop()
            return
          }
        } catch { /* keep the camera fallback usable */ }
        frame.current = requestAnimationFrame(scan)
      }
      frame.current = requestAnimationFrame(scan)
    } catch {
      setError('Camera access was unavailable. Enter the UPC below instead.')
      stop()
    }
  }

  if (supported === false) {
    return <div className="flex items-start gap-3 rounded-2xl bg-[#eee8dc] p-4 text-sm leading-6 text-stone-700"><CameraOff aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><span>Live barcode detection is not available in this browser. Enter the printed UPC below.</span></div>
  }

  return (
    <div>
      {active && <div className="relative mb-4 h-56 overflow-hidden rounded-2xl bg-stone-950"><video aria-label="Live barcode camera" className="size-full object-cover" muted playsInline ref={video} /><div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-[#f5c842]" /></div>}
      <SecondaryButton className="w-full" onClick={active ? stop : start} type="button">
        {active ? <CameraOff aria-hidden="true" className="size-5" /> : <Camera aria-hidden="true" className="size-5" />}
        {active ? 'Stop camera' : 'Scan barcode with camera'}
      </SecondaryButton>
      {error && <p className="mt-3 flex gap-2 text-sm text-amber-900"><Barcode aria-hidden="true" className="size-4 shrink-0" />{error}</p>}
    </div>
  )
}
