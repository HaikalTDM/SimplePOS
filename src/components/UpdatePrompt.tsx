import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { KeycapButton } from "./index";

/**
 * "New version ready" prompt. With registerType "prompt" the new service
 * worker waits until the user taps Refresh; we then activate it and reload.
 *
 * Reloading the page only re-fetches the app shell — IndexedDB (products,
 * sales, settings, sessions…) is untouched, so no local data is ever lost.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [busy, setBusy] = useState(false);

  // Check for a new deployment whenever the tab regains focus / is shown, so
  // long-lived installed apps notice updates without a restart.
  useEffect(() => {
    const check = () => {
      void navigator.serviceWorker?.getRegistration().then((reg) => reg?.update());
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!needRefresh) return null;

  const refresh = async () => {
    setBusy(true);
    await updateServiceWorker(true); // activates the new worker + reloads
  };

  return (
    <div className="update-card" role="alert" aria-live="polite">
      <div className="update-card__body">
        <span className="update-card__dot" aria-hidden="true" />
        <div className="update-card__copy">
          <p className="update-card__title">New version ready</p>
          <p className="update-card__text">
            Refresh to get the latest. Your products, sales and settings stay
            safe on this device.
          </p>
        </div>
      </div>
      <div className="update-card__actions">
        <KeycapButton variant="gold" loading={busy} onClick={() => void refresh()}>
          Refresh
        </KeycapButton>
        <KeycapButton variant="ghost" disabled={busy} onClick={() => setNeedRefresh(false)}>
          Later
        </KeycapButton>
      </div>
    </div>
  );
}
