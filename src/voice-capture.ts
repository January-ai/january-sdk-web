export type VoiceCaptureState = 'idle' | 'requestingPermission' | 'recording' | 'processing';

export type VoiceCaptureErrorCode =
  | 'unsupported'
  | 'permissionDenied'
  | 'microphoneUnavailable'
  | 'recordingFailed'
  | 'invalidState'
  | 'cancelled';

export class VoiceCaptureError extends Error {
  readonly code: VoiceCaptureErrorCode;

  constructor(code: VoiceCaptureErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'VoiceCaptureError';
    this.code = code;
  }
}

export interface VoiceCaptureOptions {
  /** BCP 47 locale used by browser speech recognition. Defaults to the document locale. */
  language?: string;
}

export interface VoiceCaptureResult {
  durationMs: number;
  /** Present when this browser provides speech recognition and recognized speech. */
  transcript?: string;
}

export interface VoiceCaptureSnapshot {
  state: VoiceCaptureState;
  audioLevel: number;
  durationMs: number;
  partialTranscript: string;
}

export interface VoiceCaptureObserver {
  onAudioLevel(level: number): void;
  onPartialTranscript(transcript: string): void;
}

export interface VoiceCaptureRecording {
  stop(): Promise<{ transcript?: string }>;
  cancel(): void;
}

/** Injectable browser boundary for tests and non-standard web runtimes. */
export interface VoiceCaptureAdapter {
  readonly isSupported: boolean;
  readonly isTranscriptionSupported: boolean;
  start(options: VoiceCaptureOptions, observer: VoiceCaptureObserver): Promise<VoiceCaptureRecording>;
}

const idleSnapshot: VoiceCaptureSnapshot = {
  state: 'idle',
  audioLevel: 0,
  durationMs: 0,
  partialTranscript: '',
};

/**
 * Framework-free browser voice capture with an observable state machine.
 * Call dispose() when the owning component or page is removed.
 */
export class VoiceCaptureSession {
  readonly isSupported: boolean;
  readonly isTranscriptionSupported: boolean;

  private readonly adapter: VoiceCaptureAdapter;
  private readonly now: () => number;
  private readonly listeners = new Set<(snapshot: VoiceCaptureSnapshot) => void>();
  private snapshotValue: VoiceCaptureSnapshot = idleSnapshot;
  private recording?: VoiceCaptureRecording;
  private startedAt?: number;
  private timer?: ReturnType<typeof setInterval>;
  private generation = 0;

  constructor(adapter: VoiceCaptureAdapter = browserVoiceCaptureAdapter(), now: () => number = () => performance.now()) {
    this.adapter = adapter;
    this.now = now;
    this.isSupported = adapter.isSupported;
    this.isTranscriptionSupported = adapter.isTranscriptionSupported;
  }

  get snapshot(): VoiceCaptureSnapshot {
    return { ...this.snapshotValue };
  }

  subscribe(listener: (snapshot: VoiceCaptureSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(options: VoiceCaptureOptions = {}): Promise<void> {
    if (this.snapshotValue.state !== 'idle') {
      throw new VoiceCaptureError('invalidState', 'Voice capture is already active.');
    }
    if (!this.adapter.isSupported) {
      throw new VoiceCaptureError('unsupported', 'Voice capture is not supported in this browser.');
    }

    const generation = ++this.generation;
    this.update({ state: 'requestingPermission', audioLevel: 0, durationMs: 0, partialTranscript: '' });
    try {
      const recording = await this.adapter.start(options, {
        onAudioLevel: (audioLevel) => {
          if (generation === this.generation && this.snapshotValue.state === 'recording') {
            this.update({ audioLevel: normalizeAudioLevel(audioLevel) });
          }
        },
        onPartialTranscript: (partialTranscript) => {
          if (generation === this.generation && this.snapshotValue.state === 'recording') {
            this.update({ partialTranscript: normalizeTranscript(partialTranscript) });
          }
        },
      });
      if (generation !== this.generation) {
        recording.cancel();
        return;
      }
      this.recording = recording;
      this.startedAt = this.now();
      this.update({ state: 'recording' });
      this.timer = setInterval(() => this.updateDuration(generation), 100);
    } catch (error) {
      if (generation !== this.generation) return;
      this.reset();
      throw mapCaptureError(error);
    }
  }

  async stop(): Promise<VoiceCaptureResult> {
    if (this.snapshotValue.state !== 'recording' || !this.recording || this.startedAt === undefined) {
      throw new VoiceCaptureError('invalidState', 'Start voice capture before stopping it.');
    }
    const generation = this.generation;
    const recording = this.recording;
    const durationMs = Math.max(0, Math.round(this.now() - this.startedAt));
    this.clearTimer();
    this.update({ state: 'processing', audioLevel: 0, durationMs });
    try {
      const result = await recording.stop();
      if (generation !== this.generation) {
        throw new VoiceCaptureError('cancelled', 'Voice capture was cancelled.');
      }
      const transcript = normalizeTranscript(result.transcript ?? this.snapshotValue.partialTranscript);
      const capture: VoiceCaptureResult = {
        durationMs,
        ...(transcript ? { transcript } : {}),
      };
      this.reset();
      return capture;
    } catch (error) {
      if (generation === this.generation) this.reset();
      throw mapCaptureError(error);
    }
  }

  cancel(): void {
    ++this.generation;
    this.recording?.cancel();
    this.reset();
  }

  dispose(): void {
    this.cancel();
    this.listeners.clear();
  }

  private updateDuration(generation: number): void {
    if (generation !== this.generation || this.snapshotValue.state !== 'recording' || this.startedAt === undefined) return;
    this.update({ durationMs: Math.max(0, Math.round(this.now() - this.startedAt)) });
  }

  private reset(): void {
    this.clearTimer();
    this.recording = undefined;
    this.startedAt = undefined;
    this.update({ ...idleSnapshot });
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  private update(patch: Partial<VoiceCaptureSnapshot>): void {
    this.snapshotValue = { ...this.snapshotValue, ...patch };
    for (const listener of this.listeners) listener({ ...this.snapshotValue });
  }
}

interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type VoiceCaptureGlobal = typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function browserVoiceCaptureAdapter(): VoiceCaptureAdapter {
  const mediaDevices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
  const Recorder = typeof MediaRecorder === 'undefined' ? undefined : MediaRecorder;
  const voiceGlobal = globalThis as VoiceCaptureGlobal;
  const Recognition = voiceGlobal.SpeechRecognition ?? voiceGlobal.webkitSpeechRecognition;
  return {
    isSupported: Boolean(mediaDevices?.getUserMedia && Recorder),
    isTranscriptionSupported: Boolean(Recognition),
    async start(options, observer) {
      if (!mediaDevices?.getUserMedia || !Recorder) {
        throw new VoiceCaptureError('unsupported', 'Voice capture is not supported in this browser.');
      }
      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        throw mapCaptureError(error);
      }

      try {
        return createBrowserRecording(stream, Recorder, Recognition, options, observer);
      } catch (error) {
        for (const track of stream.getTracks()) track.stop();
        throw mapCaptureError(error);
      }
    },
  };
}

function createBrowserRecording(
  stream: MediaStream,
  Recorder: typeof MediaRecorder,
  Recognition: SpeechRecognitionConstructor | undefined,
  options: VoiceCaptureOptions,
  observer: VoiceCaptureObserver,
): VoiceCaptureRecording {
  const recorder = new Recorder(stream);
  let finalTranscript = '';
  let cancelled = false;
  let recognition: SpeechRecognitionLike | undefined;
  let stopPromise: Promise<{ transcript?: string }> | undefined;
  const stopMeter = startAudioMeter(stream, observer.onAudioLevel);

  recorder.start();

  if (Recognition) {
    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options.language ?? (typeof document === 'undefined' ? 'en-US' : document.documentElement.lang || navigator.language);
    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript ?? '';
        if (result?.isFinal) finalTranscript += ` ${text}`;
        else interim += ` ${text}`;
      }
      observer.onPartialTranscript(normalizeTranscript(`${finalTranscript} ${interim}`));
    };
    try {
      recognition.start();
    } catch {
      recognition = undefined;
    }
  }

  function finish(): Promise<{ transcript?: string }> {
    if (stopPromise) return stopPromise;
    stopPromise = new Promise((resolve, reject) => {
      recorder.addEventListener('stop', () => {
        releaseResources();
        if (cancelled) {
          reject(new VoiceCaptureError('cancelled', 'Voice capture was cancelled.'));
          return;
        }
        resolve(normalizeTranscript(finalTranscript) ? { transcript: normalizeTranscript(finalTranscript) } : {});
      }, { once: true });
      recorder.addEventListener('error', () => {
        releaseResources();
        reject(new VoiceCaptureError('recordingFailed', 'The browser could not record audio.'));
      }, { once: true });
      if (recorder.state === 'inactive') {
        releaseResources();
        reject(new VoiceCaptureError('recordingFailed', 'The audio recorder stopped unexpectedly.'));
        return;
      }
      try { recognition?.stop(); } catch { recognition?.abort(); }
      recorder.stop();
    });
    return stopPromise;
  }

  function releaseResources(): void {
    stopMeter();
    try { recognition?.abort(); } catch { /* already stopped */ }
    for (const track of stream.getTracks()) track.stop();
  }

  return {
    stop: finish,
    cancel() {
      cancelled = true;
      releaseResources();
      if (recorder.state !== 'inactive') recorder.stop();
    },
  };
}

function startAudioMeter(stream: MediaStream, onLevel: (level: number) => void): () => void {
  if (typeof AudioContext === 'undefined') return () => undefined;
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  let frame = 0;
  let stopped = false;
  const measure = () => {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const centered = (sample - 128) / 128;
      sum += centered * centered;
    }
    onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
    frame = requestAnimationFrame(measure);
  };
  frame = requestAnimationFrame(measure);
  return () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    source.disconnect();
    void context.close();
  };
}

function normalizeTranscript(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeAudioLevel(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function mapCaptureError(error: unknown): VoiceCaptureError {
  if (error instanceof VoiceCaptureError) return error;
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return new VoiceCaptureError('permissionDenied', 'Allow microphone access to capture voice.', { cause: error });
    }
    if (error.name === 'NotFoundError' || error.name === 'NotReadableError') {
      return new VoiceCaptureError('microphoneUnavailable', 'No available microphone was found.', { cause: error });
    }
  }
  return new VoiceCaptureError('recordingFailed', 'Voice capture failed.', { cause: error });
}
