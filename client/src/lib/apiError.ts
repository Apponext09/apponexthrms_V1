/**
 * API errors are `{ success: false, error: { code, message, details } }`.
 * Never pass that object into JSX or toast — React will crash.
 */
export function formatApiError(err: unknown, fallback = 'Something went wrong'): string {
  const anyErr = err as any;
  const data = anyErr?.response?.data ?? anyErr;
  const payload = data?.error;

  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload && typeof payload === 'object') {
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
    if (payload.details != null) {
      if (typeof payload.details === 'string') return payload.details;
      try {
        const entries = Object.entries(payload.details as Record<string, unknown>);
        if (entries.length > 0) {
          return entries
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
            .join(' | ');
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof anyErr?.message === 'string' && anyErr.message.trim()) return anyErr.message;
  return fallback;
}
