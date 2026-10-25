"use client";

import { useEffect, useRef, useState } from "react";

const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;

/**
 * Session timeout for shared/public devices. After `idleMs` without input a warning appears for
 * `warnMs`; if the user does nothing, `onTimeout` signs them out. The server also expires tokens.
 */
export function useIdleLogout(onTimeout: () => void, enabled: boolean, idleMs = 14 * 60_000, warnMs = 60_000) {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(warnMs / 1000));
  const last = useRef(0);
  const cb = useRef(onTimeout);

  useEffect(() => {
    cb.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;
    last.current = Date.now();
    const bump = () => {
      if (!warning) last.current = Date.now();
    };
    EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= idleMs + warnMs) {
        cb.current();
      } else if (idle >= idleMs) {
        setWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((idleMs + warnMs - idle) / 1000)));
      }
    }, 1000);

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(tick);
    };
  }, [enabled, idleMs, warnMs, warning]);

  const stay = () => {
    last.current = Date.now();
    setWarning(false);
  };

  return { warning, secondsLeft, stay };
}
