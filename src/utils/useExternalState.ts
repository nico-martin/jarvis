import { useEffect, useRef, useState } from "preact/hooks";

export default function useExternalState<T = any>(
  subscribe: (listener: (state: T) => void) => () => void,
  getState: () => T
) {
  const [state, setState] = useState<T>(getState());
  const prevStateRef = useRef<T>(state);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const newState = getState();
      if (newState !== prevStateRef.current) {
        setState(newState);
        prevStateRef.current = newState;
      }
    });
    return () => unsubscribe();
  }, []);

  return state;
}
