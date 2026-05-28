export type AudioFormat = "mp3" | "wav";

export interface GeneratePayload {
  prompt: string;
  lyrics?: string;
  duration?: number;
  format?: AudioFormat;
  manual_seeds?: number;
}

export interface GenerateResult {
  audioSrc: string;
  shouldRevokeObjectUrl: boolean;
}

function isLikelyAudioUrl(value: string): boolean {
  return /^(https?:\/\/|\/)/.test(value);
}

function parseJsonUrlCandidate(input: unknown): string | null {
  if (typeof input === "string" && isLikelyAudioUrl(input)) {
    return input;
  }

  if (typeof input === "object" && input !== null) {
    const record = input as Record<string, unknown>;
    const candidates = [record.audio, record.url, record.download_url, record.file_url];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && isLikelyAudioUrl(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function parseErrorMessage(raw: unknown, fallback: string): string {
  if (typeof raw === "string" && raw.trim()) {
    return raw;
  }

  if (typeof raw === "object" && raw !== null) {
    const record = raw as Record<string, unknown>;
    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
  }

  return fallback;
}

export async function requestGeneration(payload: GeneratePayload): Promise<GenerateResult> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    const message = parseErrorMessage(body, "Music generation failed. Please try again.");
    throw new Error(message);
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.startsWith("audio/")) {
    const blob = await response.blob();
    return {
      audioSrc: URL.createObjectURL(blob),
      shouldRevokeObjectUrl: true,
    };
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = await response.text();
  }

  const urlCandidate = parseJsonUrlCandidate(responseBody);
  if (urlCandidate !== null) {
    return {
      audioSrc: urlCandidate,
      shouldRevokeObjectUrl: false,
    };
  }

  const message = parseErrorMessage(
    responseBody,
    "The server did not return playable audio. Please try again shortly.",
  );
  throw new Error(message);
}
