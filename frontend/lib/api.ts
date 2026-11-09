/**
 * Talks to the existing FastAPI coach. The OpenAI key stays on that server.
 * Only the public backend address is read here.
 */

const DEFAULT_API_BASE_URL = "http://localhost:8000";

export type ChatResponse = {
  reply: string;
};

/** Base URL of the FastAPI app, without a trailing slash. */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base =
    configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;

  return base.replace(/\/+$/, "");
}

/**
 * Sends one user message and returns the coach's reply text.
 * Throws an Error with a message that is safe to show in the UI.
 */
export async function requestCoachReply(message: string): Promise<string> {
  const apiBaseUrl = getApiBaseUrl();

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
  } catch {
    throw new Error(
      `Could not reach the coach at ${apiBaseUrl}. Start the backend, then try again.`,
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = readErrorDetail(payload);
    throw new Error(
      detail ??
        "The coach could not answer just now. Please try sending that again.",
    );
  }

  if (!isChatResponse(payload)) {
    throw new Error("The coach sent a response this app could not read.");
  }

  return payload.reply;
}

function isChatResponse(value: unknown): value is ChatResponse {
  if (typeof value !== "object" || value === null || !("reply" in value)) {
    return false;
  }

  return typeof value.reply === "string" && value.reply.trim().length > 0;
}

function readErrorDetail(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("detail" in value)) {
    return null;
  }

  const detail = value.detail;
  return typeof detail === "string" && detail.trim().length > 0 ? detail : null;
}
