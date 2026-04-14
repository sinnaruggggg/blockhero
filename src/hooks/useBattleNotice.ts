import { useCallback, useEffect, useRef, useState } from 'react';

export function useBattleNotice(defaultDurationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const [messageKey, setMessageKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageKeyRef = useRef(0);

  const clearNotice = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
  }, []);

  const showNotice = useCallback(
    (nextMessage: string, durationMs = defaultDurationMs) => {
      messageKeyRef.current += 1;
      setMessage(nextMessage);
      setMessageKey(messageKeyRef.current);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setMessage(null);
      }, durationMs);
    },
    [defaultDurationMs],
  );

  useEffect(() => clearNotice, [clearNotice]);

  return {
    message,
    messageKey,
    showNotice,
    clearNotice,
  };
}
