import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AudioFormat, GeneratePayload, requestGeneration } from "./api";

type FormValues = {
  prompt: string;
  lyrics: string;
  duration: number;
  format: AudioFormat;
};

const DEFAULT_FORM: FormValues = {
  prompt: "",
  lyrics: "",
  duration: 30,
  format: "mp3",
};

function clampDuration(value: number): number {
  if (Number.isNaN(value)) {
    return DEFAULT_FORM.duration;
  }
  return Math.min(59.9, Math.max(0.1, value));
}

function toPayload(values: FormValues): GeneratePayload {
  const trimmedLyrics = values.lyrics.trim();

  return {
    prompt: values.prompt.trim(),
    ...(trimmedLyrics ? { lyrics: trimmedLyrics } : {}),
    duration: clampDuration(values.duration),
    format: values.format,
    manual_seeds: 1,
  };
}

export default function App() {
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (currentObjectUrlRef.current !== null) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
    };
  }, []);

  const canSubmit = useMemo(
    () => !isGenerating && formValues.prompt.trim().length > 0,
    [isGenerating, formValues.prompt],
  );

  function clearCurrentAudio() {
    if (currentObjectUrlRef.current !== null) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
    setCurrentAudioSrc(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      if (!formValues.prompt.trim()) {
        setErrorMessage("Prompt is required.");
      }
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    clearCurrentAudio();

    try {
      const payload = toPayload(formValues);
      const result = await requestGeneration(payload);

      if (result.shouldRevokeObjectUrl) {
        currentObjectUrlRef.current = result.audioSrc;
      }

      setCurrentAudioSrc(result.audioSrc);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Music generation failed unexpectedly. Please retry.";
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="noise-overlay" aria-hidden="true" />
      <main className="studio-card" aria-busy={isGenerating}>
        <header className="hero">
          <p className="eyebrow">Inference Lab</p>
          <h1>Compose Tracks From One Prompt</h1>
        </header>

        <section className="panel">
          <form className="generation-form" onSubmit={onSubmit}>
            <label htmlFor="prompt">Prompt</label>
            <textarea
              id="prompt"
              name="prompt"
              rows={3}
              required
              value={formValues.prompt}
              disabled={isGenerating}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, prompt: event.target.value }))
              }
              placeholder="Dreamy synthwave with neon bass and a cinematic build"
            />

            <label htmlFor="lyrics">Lyrics</label>
            <textarea
              id="lyrics"
              name="lyrics"
              rows={5}
              value={formValues.lyrics}
              disabled={isGenerating}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, lyrics: event.target.value }))
              }
              placeholder="Optional lyrics. Leave blank for instrumental guidance."
            />

            <div className="field-row">
              <div className="field-block">
                <label htmlFor="duration">Duration (seconds)</label>
                <input
                  id="duration"
                  name="duration"
                  type="number"
                  min={0.1}
                  max={59.9}
                  step={0.1}
                  value={formValues.duration}
                  disabled={isGenerating}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      duration: clampDuration(Number(event.target.value)),
                    }))
                  }
                />
              </div>

              <div className="field-block">
                <label htmlFor="format">Format</label>
                <select
                  id="format"
                  name="format"
                  value={formValues.format}
                  disabled={isGenerating}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      format: event.target.value as AudioFormat,
                    }))
                  }
                >
                  <option value="mp3">mp3</option>
                  <option value="wav">wav</option>
                </select>
              </div>

            </div>

            <button
              className={`submit-button ${isGenerating ? "is-generating" : ""}`.trim()}
              type="submit"
              disabled={!canSubmit}
            >
              {isGenerating ? (
                <>
                  <span className="bars button-bars" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                  {/* <span aria-label="Generating music" role="status">Generating...</span> */}
                </>
              ) : (
                "Generate Music"
              )}
            </button>

            {errorMessage && <p className="error-banner">{errorMessage}</p>}
          </form>
        </section>

        <section className="panel playback-panel" aria-live="polite">
          <h2>Playback</h2>
          <div className="playback-content">
            {currentAudioSrc ? (
              <div className="player-wrap">
                <audio controls preload="metadata" src={currentAudioSrc} className="audio-player">
                  Your browser does not support the audio element.
                </audio>
              </div>
            ) : (
              <p className="status-idle">No generated track yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
