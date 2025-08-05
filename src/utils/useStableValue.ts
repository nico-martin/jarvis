import { useEffect, useState } from "preact/hooks";

function useStableValue<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value]);

  return debouncedValue;
}

export default useStableValue;
