"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";

/** GET helper with loading / error / reload and protection against out-of-order responses. */
export function useFetch<T>(url: string | null, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!url);
  const seq = useRef(0);
  const key = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const res = await api.get<T>(url, { params: JSON.parse(key) });
      if (id === seq.current) {
        setData(res.data);
        setError("");
      }
    } catch (e) {
      if (id === seq.current) setError(apiError(e, "Could not load this page. Check your connection and try again."));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [url, key]);

  useEffect(() => {
    // Fetching and updating state is the purpose of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { data, setData, error, loading, reload: load };
}
