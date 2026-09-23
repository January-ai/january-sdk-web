import type { Page } from '@playwright/test'

/**
 * Stand-ins for the browser capabilities a headless run does not have: the camera and
 * microphone (`getUserMedia`), speech recognition, and `BarcodeDetector`. Each installs
 * before the page's own scripts, so the demo sees them as the browser's.
 */

export interface VoiceStubOptions {
  /** What speech recognition hears. An empty string hears nothing. */
  transcript?: string
  /** False removes MediaRecorder, so voice capture is unsupported. */
  recording?: boolean
  /** False removes speech recognition, so capture works but cannot transcribe. */
  transcription?: boolean
  /** `denied` rejects the microphone request as the browser does when access is blocked. */
  microphone?: 'granted' | 'denied'
}

export async function stubVoiceCapture(page: Page, options: VoiceStubOptions = {}) {
  await page.addInitScript((settings) => {
    const scope = window as unknown as Record<string, unknown>
    if (!settings.recording) delete scope.MediaRecorder
    navigator.mediaDevices.getUserMedia = async () => {
      if (settings.microphone === 'denied') throw new DOMException('Permission denied', 'NotAllowedError')
      return new AudioContext().createMediaStreamDestination().stream
    }
    class FakeRecognition {
      continuous = false
      interimResults = false
      lang = ''
      onresult: ((event: unknown) => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      start() {
        if (!settings.transcript) return
        const result = Object.assign([{ transcript: settings.transcript }], { isFinal: true })
        // Heard as soon as recording starts, so a stop right after still has the words.
        setTimeout(() => this.onresult?.({ resultIndex: 0, results: { length: 1, 0: result } }), 0)
      }
      stop() { this.onend?.() }
      abort() {}
    }
    delete scope.SpeechRecognition
    delete scope.webkitSpeechRecognition
    if (settings.transcription) scope.SpeechRecognition = FakeRecognition
  }, { transcript: options.transcript ?? 'banana', recording: options.recording ?? true, transcription: options.transcription ?? true, microphone: options.microphone ?? 'granted' })
}

export interface BarcodeStubOptions {
  /** The UPC the detector reads once the camera has run for `afterMs`; null never reads one. */
  barcode?: string | null
  afterMs?: number
  /** False removes BarcodeDetector, so live detection is unavailable. */
  detector?: boolean
  camera?: 'granted' | 'denied'
}

export async function stubBarcodeCamera(page: Page, options: BarcodeStubOptions = {}) {
  await page.addInitScript((settings) => {
    const scope = window as unknown as Record<string, unknown>
    delete scope.BarcodeDetector
    if (settings.detector) {
      let firstLook = 0
      scope.BarcodeDetector = class {
        async detect() {
          firstLook ||= Date.now()
          return settings.barcode && Date.now() - firstLook >= settings.afterMs ? [{ rawValue: settings.barcode }] : []
        }
      }
    }
    navigator.mediaDevices.getUserMedia = async () => {
      if (settings.camera === 'denied') throw new DOMException('Permission denied', 'NotAllowedError')
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      const context = canvas.getContext('2d')!
      const paint = () => { context.fillStyle = `hsl(${Date.now() % 360} 30% 40%)`; context.fillRect(0, 0, 320, 240); requestAnimationFrame(paint) }
      paint()
      return canvas.captureStream(15)
    }
  }, { barcode: options.barcode === undefined ? '012345678905' : options.barcode, afterMs: options.afterMs ?? 800, detector: options.detector ?? true, camera: options.camera ?? 'granted' })
}
