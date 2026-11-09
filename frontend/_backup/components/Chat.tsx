"use client";

import { useEffect, useId, useRef, useState } from "react";
import { requestCoachReply } from "@/lib/api";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

const WELCOME_MESSAGE =
  "Hello. I'm here when you want to talk through stress, motivation, habits, or confidence. What is on your mind?";

const TEXTAREA_MAX_HEIGHT = 160;

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const errorId = useId();
  const inputId = useId();

  const trimmedDraft = draft.trim();
  const canSend = trimmedDraft.length > 0 && !isSending;

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, error]);

  function updateDraft(nextValue: string) {
    setDraft(nextValue);
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }

  async function sendMessage() {
    const message = draft.trim();
    if (message.length === 0 || sendingRef.current) {
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    setError(null);
    setDraft("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: message },
    ]);

    try {
      const reply = await requestCoachReply(message);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: reply },
      ]);
    } catch (caught) {
      const description =
        caught instanceof Error
          ? caught.message
          : "Something went wrong while sending your message.";
      setError(description);
    } finally {
      sendingRef.current = false;
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4 py-5 sm:px-6 sm:py-8">
      <header className="shrink-0 pb-5">
        <p className="text-sm font-medium tracking-wide text-foreground/80">
          A quiet place to think
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Mental coach
        </h1>
      </header>

      <div
        ref={listRef}
        aria-live="polite"
        aria-relevant="additions"
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isSending ? (
          <div
            className="mr-auto flex max-w-[85%] items-center gap-3 rounded-3xl bg-paper px-4 py-3 text-foreground shadow-sm"
            role="status"
          >
            <span className="flex gap-1" aria-hidden="true">
              <span className="size-2 animate-pulse rounded-full bg-ink" />
              <span className="size-2 animate-pulse rounded-full bg-ink [animation-delay:150ms]" />
              <span className="size-2 animate-pulse rounded-full bg-ink [animation-delay:300ms]" />
            </span>
            <span>Thinking</span>
          </div>
        ) : null}
      </div>

      <form
        className="mt-4 shrink-0"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mb-3 rounded-2xl bg-[#f6e4dc] px-4 py-3 text-sm leading-6 text-[#6b2b1f]"
          >
            {error}
          </p>
        ) : null}

        <label htmlFor={inputId} className="sr-only">
          Message
        </label>
        <div className="flex items-end gap-3 rounded-3xl border border-line bg-paper p-2 shadow-sm">
          <textarea
            id={inputId}
            ref={inputRef}
            value={draft}
            rows={1}
            placeholder="Write a message"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-base leading-6 text-foreground outline-none placeholder:text-foreground/50"
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="mb-1 h-11 shrink-0 rounded-full bg-ink px-5 text-sm font-medium text-user-text transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-2 px-2 text-xs leading-5 text-foreground/70">
          Enter sends. Shift+Enter starts a new line.
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
          ? "ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-ink px-4 py-3 text-user-text shadow-sm"
          : "mr-auto max-w-[85%] rounded-3xl rounded-bl-md border border-line bg-paper px-4 py-3 text-foreground shadow-sm"
      }
    >
      <p className="mb-1 text-xs font-medium tracking-wide opacity-70">
        {isUser ? "You" : "Coach"}
      </p>
      <p className="whitespace-pre-wrap text-base leading-7">{message.content}</p>
    </article>
  );
}
