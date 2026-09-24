# Voice capture

`VoiceCaptureSession` records from the microphone and transcribes speech in the browser, for spoken food, meal, or restaurant searches. It runs entirely in the browser: no token, scope, or origin enablement needed. It doesn't depend on React or any other UI framework.

## Capture and transcribe

Create one session for the lifetime of the component that owns it, and subscribe before starting so the UI can show permission, recording, and processing states. Call `start()` from a user gesture, such as a microphone button, and `stop()` when the user presses stop.

```ts
import { VoiceCaptureError, VoiceCaptureSession } from '@januaryai/web-sdk';

const voice = new VoiceCaptureSession();
const unsubscribe = voice.subscribe((snapshot) => render(snapshot)); // state, audioLevel, durationMs, partialTranscript

// First gesture: the microphone button.
export async function onMicPressed() {
  try {
    await voice.start({ language: 'en-US' });
  } catch (error) {
    if (error instanceof VoiceCaptureError) showVoiceError(error.code);
  }
}

// Second gesture: the stop button.
export async function onStopPressed() {
  const { transcript } = await voice.stop();
  if (transcript) setQuery(transcript);
}

// When the component or page goes away.
export function onUnmount() {
  unsubscribe();
  voice.dispose();
}
```

Call `stop()` only while `voice.snapshot.state` is `recording`. `cancel()` discards the capture at once; `dispose()` also removes every subscriber. `VoiceCaptureError.code` is one of `unsupported`, `permissionDenied`, `microphoneUnavailable`, `recordingFailed`, `invalidState`, or `cancelled`.

## Browser support

A result has `durationMs` and, when the browser recognized speech, `transcript`. Check `voice.isSupported` before showing the microphone, and `voice.isTranscriptionSupported` when you need text. Speech recognition isn't available in every browser and can depend on operating-system services, so keep a text field too.

## Permissions and privacy

Microphone access needs a secure context such as HTTPS; `localhost` works for development. Ask only after the user presses the microphone button, show a recording indicator with stop and cancel buttons, and explain how to allow the microphone again after a denial.

The SDK doesn't keep, return, or upload the recording. It discards audio chunks during capture and releases the microphone when capture stops or is canceled. The browser's speech-recognition service controls how speech is processed.

The Search screen of the [React example app](../getting-started/example-app.md) shows this flow.
