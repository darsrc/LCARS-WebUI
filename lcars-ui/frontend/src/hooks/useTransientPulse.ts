import { useEffect, useRef, useState } from "react";

/**
 * WHY: draw brief attention to changing values (status/progress/gauge) without
 * persisting additional widget state in the manifest/runtime.
 */
export const useTransientPulse = (value: unknown, durationMs = 420): boolean => {
  const [active, setActive] = useState(false);
  const previous = useRef<unknown>(value);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      previous.current = value;
      return;
    }

    if (Object.is(previous.current, value)) {
      return;
    }

    previous.current = value;
    setActive(true);
    const timeoutId = window.setTimeout(() => {
      setActive(false);
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, value]);

  return active;
};
