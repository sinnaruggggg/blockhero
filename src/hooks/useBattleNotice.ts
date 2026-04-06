import {useCallback, useEffect, useRef, useState} from 'react';

export function useBattleNotice(defaultDurationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNotice = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
  }, []);

  const showNotice = useCallback(
    (nextMessage: string, durationMs = defaultDurationMs) => {
      setMessage(nextMessage);
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
    showNotice,
    clearNotice,
  };
}
