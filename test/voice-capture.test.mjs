import assert from 'node:assert/strict';
import test from 'node:test';
import { VoiceCaptureError, VoiceCaptureSession } from '../dist/index.js';

function fixtureAdapter(overrides = {}) {
  let observer;
  let cancelled = false;
  const recording = {
    async stop() {
      return { audio: new Blob(['voice'], { type: 'audio/webm' }), transcript: '  greek   yogurt  ' };
    },
    cancel() { cancelled = true; },
  };
  return {
    adapter: {
      isSupported: true,
      isTranscriptionSupported: true,
      async start(_options, nextObserver) {
        observer = nextObserver;
        return recording;
      },
      ...overrides,
    },
    get observer() { return observer; },
    get cancelled() { return cancelled; },
  };
}

test('voice capture publishes recording updates and returns normalized audio results', async () => {
  let now = 1_000;
  const fixture = fixtureAdapter();
  const session = new VoiceCaptureSession(fixture.adapter, () => now);
  const states = [];
  session.subscribe((snapshot) => states.push(snapshot.state));

  await session.start({ language: 'en-US' });
  fixture.observer.onAudioLevel(1.5);
  fixture.observer.onPartialTranscript(' greek   yo ');
  now = 2_250;
  const result = await session.stop();

  assert.equal(result.transcript, 'greek yogurt');
  assert.equal(result.audio.type, 'audio/webm');
  assert.equal(result.mimeType, 'audio/webm');
  assert.equal(result.durationMs, 1_250);
  assert.equal(states[0], 'requestingPermission');
  assert.ok(states.slice(1, -2).every((state) => state === 'recording'));
  assert.deepEqual(states.slice(-2), ['processing', 'idle']);
  assert.deepEqual(session.snapshot, { state: 'idle', audioLevel: 0, durationMs: 0, partialTranscript: '' });
});

test('voice capture can return audio when browser transcription is unavailable', async () => {
  const fixture = fixtureAdapter({ isTranscriptionSupported: false });
  fixture.adapter.start = async (_options, observer) => {
    fixture.adapterObserver = observer;
    return { stop: async () => ({ audio: new Blob(['voice'], { type: 'audio/mp4' }) }), cancel() {} };
  };
  const session = new VoiceCaptureSession(fixture.adapter, () => 100);

  await session.start();
  const result = await session.stop();

  assert.equal(result.transcript, undefined);
  assert.equal(result.mimeType, 'audio/mp4');
  assert.equal(session.isTranscriptionSupported, false);
});

test('cancel stops the active capture and returns to idle', async () => {
  const fixture = fixtureAdapter();
  const session = new VoiceCaptureSession(fixture.adapter);
  await session.start();

  session.cancel();

  assert.equal(fixture.cancelled, true);
  assert.equal(session.snapshot.state, 'idle');
});

test('unsupported and invalid state failures use stable error codes', async () => {
  const unsupported = new VoiceCaptureSession({
    isSupported: false,
    isTranscriptionSupported: false,
    async start() { throw new Error('not reached'); },
  });
  await assert.rejects(() => unsupported.start(), (error) => error instanceof VoiceCaptureError && error.code === 'unsupported');

  const fixture = fixtureAdapter();
  const session = new VoiceCaptureSession(fixture.adapter);
  await assert.rejects(() => session.stop(), (error) => error instanceof VoiceCaptureError && error.code === 'invalidState');
  await session.start();
  await assert.rejects(() => session.start(), (error) => error instanceof VoiceCaptureError && error.code === 'invalidState');
  session.cancel();
});

test('permission errors reset the session and preserve a stable code', async () => {
  const fixture = fixtureAdapter({
    async start() { throw new DOMException('denied', 'NotAllowedError'); },
  });
  const session = new VoiceCaptureSession(fixture.adapter);

  await assert.rejects(() => session.start(), (error) => error instanceof VoiceCaptureError && error.code === 'permissionDenied');
  assert.equal(session.snapshot.state, 'idle');
});
