"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Lock } from "lucide-react";
import { mask, type Vault } from "@/lib/privacy-shield";
import { TokenText } from "./ui";

interface Props {
  busy: boolean;
  vault: Vault;
  onSend: (text: string) => void;
}

export function Composer({ busy, vault, onSend }: Props) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const typedLast = useRef(false);

  // After a typed message is answered, put the cursor back in the box.
  useEffect(() => {
    if (!busy && typedLast.current) {
      typedLast.current = false;
      area.current?.focus();
    }
  }, [busy]);

  // Live preview of what PrivacyShield will hide. Uses a copy of the vault so typing never changes it.
  const preview = text.trim() ? mask(text, { ...vault }) : null;
  const labels = preview ? [...new Set(preview.findings.map((f) => f.label.en.toLowerCase()))] : [];

  const submit = () => {
    if (!text.trim() || busy) return;
    typedLast.current = true;
    onSend(text);
    setText("");
    if (area.current) area.current.style.height = "";
  };

  return (
    <div className="shrink-0 border-t border-line bg-surface px-4 pb-3 pt-2.5 sm:px-6">
      <form
        className="mx-auto max-w-[1100px]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {preview && preview.findings.length > 0 && (
          <div className="mb-2 flex items-start gap-2 rounded-lg bg-gold-soft px-3 py-2 text-[13px]">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden />
            <p className="min-w-0">
              <span className="font-semibold">Ɔhwɛfo will hide your {labels.join(", ")} before sending.</span>{" "}
              <span className="text-ink-soft">What leaves the phone: </span>
              <TokenText text={preview.masked} className="font-read text-ink" />
            </p>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-paper px-3 py-2 focus-within:border-forest">
          <label htmlFor="message" className="sr-only">
            Message
          </label>
          <textarea
            id="message"
            ref={area}
            rows={1}
            value={text}
            disabled={busy}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={busy ? "Waiting for both answers…" : "Message the MoMo assistant in English, Twi or Pidgin"}
            className="max-h-[140px] min-h-[28px] flex-1 resize-none bg-transparent py-1 font-read text-[15.5px] leading-relaxed outline-none placeholder:text-ink-faint disabled:cursor-progress"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-forest text-forest-ink hover:opacity-90 disabled:bg-line-strong disabled:text-surface"
          >
            <ArrowUp className="size-[18px]" aria-hidden />
            <span className="sr-only">Send to both sides</span>
          </button>
        </div>
        <p className="mt-1.5 hidden text-xs text-ink-faint sm:block">
          Each message goes to both sides at once. Enter to send, Shift + Enter for a new line. All names and numbers in the demos are made up.
        </p>
      </form>
    </div>
  );
}
