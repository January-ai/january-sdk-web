# Voice capture

`VoiceCaptureSession` adds browser microphone transcription without coupling the
SDK to React or another UI framework. It is intended for explicit user-driven
flows such as speaking a food, meal description, or restaurant search.

## Capture and transcribe

Create one session for the lifetime of the owning component. Subscribe before
starting so the UI can render permission, recording, and processing states.

```ts
import {
  VoiceCaptureError,
  VoiceCaptureSession,
  type VoiceCaptureSnapshot,
} from '@januaryai/web-sdk';

const voice = new VoiceCaptureSession();

const unsubscribe = voice.subscribe((snapshot: VoiceCaptureSnapshot) => {
  updateWaveform(snapshot.audioLevel);
  updateTimer(snapshot.durationMs);
  updatePartialTranscript(snapshot.partialTranscript);
});

try {
  await voice.start({ language: 'en-US' });
  const result = await voice.stop();

  const query = result.transcript;
} catch (error) {
  if (error instanceof VoiceCaptureError) {
    showVoiceError(error.code);
  }
}

unsubscribe();
voice.dispose();
```

`start()` must be called from a user gesture. Call `stop()` only while the
session state is `recording`. `cancel()` immediately releases the active capture;
`dispose()` also removes all subscribers.

## Result and browser capabilities

Every successful result contains:

| Field | Meaning |
| --- | --- |
| `durationMs` | Capture duration in milliseconds |
| `transcript` | Recognized speech when browser speech recognition is available |

Check `session.isSupported` before offering the microphone action and
`session.isTranscriptionSupported` when the flow requires text. Keep text input
available because speech recognition is not universal and may depend on browser
or operating-system services.

## Permissions and privacy

Microphone access requires a secure context such as HTTPS; localhost is suitable
for local development. Ask only after the user presses the microphone control,
show a persistent recording indicator, provide visible stop and cancel actions,
and explain how to re-enable site microphone access after a denial.

The SDK does not retain, return, or upload a recording. It releases the microphone
stream when capture stops or is cancelled. The browser's speech-recognition
service controls how voice input is processed for transcription.

## React demo

The Search screen in `examples/react-demo` places a microphone beside the food
or restaurant query. While recording it shows a live audio meter, duration,
stop, and cancel controls. Stopping appends recognized text
to the query. Barcode mode disables voice input.
