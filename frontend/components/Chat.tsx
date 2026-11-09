"use client";

import { useEffect, useId, useRef, useState } from "react";
import { requestCoachReply } from "@/lib/api";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

const INITIAL_ASSISTANT_MESSAGE =
  "Hello. I'm here whenever you want to think through stress, motivation, habits, or confidence. What's on your mind today?";

const CONVERSATION_STARTERS = [
  "I've been feeling overwhelmed at work lately.",
  "I want to build a healthier morning routine.",
  "I struggle with self-doubt and confidence.",
];

const TEXTAREA_MAX_HEIGHT = 160;

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "initial", role: "assistant", content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const errorId = useId();
  const inputId = useId();

  const hasUserMessage = messages.some((m) => m.role === "user");
  const trimmedDraft = draft.trim();
  const canSend = trimmedDraft.length > 0 && !isSending;

  // Keep the message list scrolled to the bottom.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, error]);

  function updateDraft(nextValue: string) {
    setDraft(nextValue);
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }

  async function sendMessage(text?: string) {
    const message = (text ?? draft).trim();
    if (message.length === 0 || sendingRef.current) return;

    sendingRef.current = true;
    setIsSending(true);
    setError(null);
    setDraft("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const history = messages.map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: message },
    ]);

    try {
      const reply = await requestCoachReply(message, history);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: reply },
      ]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong while sending your message.",
      );
    } finally {
      sendingRef.current = false;
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[680px] flex-col px-5 sm:px-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 pt-7 pb-5 sm:pt-10 sm:pb-6">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted">
          Mental Coach
        </p>
        <h1
          className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          A quiet space to think
        </h1>
      </header>

      {/* ── Welcome screen ─────────────────────────────────────────── */}
      {!hasUserMessage && (
        <div className="shrink-0">
          <p className="max-w-sm text-[0.9375rem] leading-7 text-charcoal/80">
            {INITIAL_ASSISTANT_MESSAGE}
          </p>

          <p className="mt-5 text-xs font-medium tracking-wide uppercase text-muted">
            Try a starter
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {CONVERSATION_STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={isSending}
                className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-charcoal text-left transition-colors hover:border-charcoal/30 hover:bg-line/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void sendMessage(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Message list ────────────────────────────────────────────── */}
      {hasUserMessage && (
        <div
          ref={listRef}
          aria-live="polite"
          aria-relevant="additions"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isSending && <ThinkingIndicator />}
        </div>
      )}

      {/* Flexible gap so the composer hugs the bottom on welcome screen */}
      {!hasUserMessage && <div className="flex-1" />}

      {/* ── Composer ────────────────────────────────────────────────── */}
      <form
        className="shrink-0 pb-5 sm:pb-8"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
      >
        {error && (
          <div
            id={errorId}
            role="alert"
            className="mb-3 flex items-start gap-3 rounded-xl bg-error-bg px-4 py-3 text-sm leading-6 text-error-fg"
          >
            <span className="mt-0.5 shrink-0 text-base leading-none">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <label htmlFor={inputId} className="sr-only">
          Message your coach
        </label>

        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-sm transition-shadow duration-150 focus-within:border-charcoal/25 focus-within:shadow-md">
          <textarea
            id={inputId}
            ref={inputRef}
            value={draft}
            rows={1}
            placeholder="Write a message…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[0.9375rem] leading-6 text-charcoal outline-none placeholder:text-muted"
            onChange={(e) => updateDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="mb-0.5 h-10 shrink-0 rounded-xl bg-ink px-5 text-sm font-medium text-user-fg transition-all duration-150 enabled:hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Send
          </button>
        </div>

        <p className="mt-2 px-1 text-xs text-muted">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article
      className={
        isUser
          ? "ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-user-bg px-4 py-3 text-user-fg shadow-sm sm:max-w-[75%]"
          : "mr-auto max-w-[82%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3 text-charcoal shadow-sm sm:max-w-[75%]"
      }
    >
      <p className="whitespace-pre-wrap text-[0.9375rem] leading-7">
        {message.content}
      </p>
    </article>
  );
}

function ThinkingIndicator() {
  return (
    <div
      role="status"
      aria-label="Coach is thinking"
      className="mr-auto flex max-w-[82%] items-center gap-1.5 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3.5 shadow-sm"
    >
      {[0, 180, 360].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          className="size-2 rounded-full bg-muted animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "1.1s" }}
        />
      ))}
    </div>
  );
}
