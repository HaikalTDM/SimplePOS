import { useCallback, useEffect, useRef, useState } from "react";
import { Share } from "lucide-react";
import { KeycapButton, IconDownload } from "./index";

// Install-to-home-screen nudge (PWA). Three paths:
//  - Chrome/Edge/Android: capture beforeinstallprompt and offer a native prompt.
//  - iOS Safari: no native event — show the Share → Add to Home Screen steps.
//  - Already installed / not supported: nothing.
//
// Anti-nag: hidden until ~2s after load, "Later" silences for a week, and a
// successful install never asks again.

const DAY = 24 * 60 * 60 * 1000;
const LATER_KEY = "simplepos:install-later";
const WEEK = 7 * DAY;

interface PromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Status = "hidden" | "available" | "ios";

function isStandalone(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function laterSilenced(ms: number): boolean {
  try {
    const stored = localStorage.getItem(LATER_KEY);
    if (!stored) return false;
    return Date.now() - Number(stored) < ms;
  } catch {
    return false;
  }
}

function rememberLater(): void {
  try {
    localStorage.setItem(LATER_KEY, String(Date.now()));
  } catch {
    // No storage — the prompt just stays visible this session.
  }
}

export default function InstallPrompt() {
  const [status, setStatus] = useState<Status>("hidden");
  const [armed, setArmed] = useState(false);
  const pending = useRef<PromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // already installed
    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (laterSilenced(WEEK)) {
        setStatus("hidden");
        return;
      }
      pending.current = e as PromptEvent;
      setStatus((s) => (s === "hidden" ? s : "available"));
    };
    const onInstalled = () => {
      try {
        localStorage.removeItem(LATER_KEY);
      } catch {
        // ignore
      }
      setStatus("hidden");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS() && !laterSilenced(WEEK)) setStatus("ios");

    const timer = window.setTimeout(() => setArmed(true), 2000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const install = useCallback(async () => {
    const evt = pending.current;
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") {
      try {
        localStorage.removeItem(LATER_KEY);
      } catch {
        // ignore
      }
      setStatus("hidden");
    } else {
      // Native sheet dismissed — don't re-pester for a day.
      rememberLater();
      setStatus("hidden");
    }
  }, []);

  const later = useCallback(() => {
    rememberLater();
    setStatus("hidden");
  }, []);

  if (!armed || status === "hidden") return null;

  return (
    <div className="install-card" role="region" aria-label="Install SimplePOS">
      <div className="install-card__body">
        <span className="install-card__icon" aria-hidden="true">
          <img src="/icons/icon.svg" alt="" width={44} height={44} />
        </span>
        <div className="install-card__copy">
          <p className="install-card__title">Put SimplePOS on your home screen</p>
          {status === "ios" ? (
            <p className="install-card__text">
              Tap the <Share size={13} className="install-card__share" aria-label="Share" /> in
              Safari, then <strong>Add to Home Screen</strong>. Instant till, no signal needed.
            </p>
          ) : (
            <p className="install-card__text">
              Open it like a real app — fast, full-screen, and it works even when the wifi gives up.
            </p>
          )}
        </div>
      </div>
      <div className="install-card__actions">
        {status === "ios" ? (
          <>
            <KeycapButton variant="gold" onClick={later}>
              <IconDownload size={16} />
              Got it
            </KeycapButton>
            <KeycapButton variant="ghost" onClick={later}>
              Not now
            </KeycapButton>
          </>
        ) : (
          <>
            <KeycapButton variant="gold" onClick={() => void install()}>
              <IconDownload size={16} />
              Install
            </KeycapButton>
            <KeycapButton variant="ghost" onClick={later}>
              Later
            </KeycapButton>
          </>
        )}
      </div>
    </div>
  );
}
