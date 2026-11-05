"use client";

import { useEffect, useState } from "react";

/** Current time as state (refreshed every `everyMs`), so components never call Date.now() while rendering. */
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
