import { useEffect, useState } from "preact/hooks";

export default function LoadingDots() {
  const [active, setActive] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const interval = window.setInterval(
      () => setActive(active === 3 ? 1 : active === 2 ? 3 : 2),
      400
    );
    return () => {
      window.clearInterval(interval);
    };
  }, [active]);

  return (
    <span>
      <span style={{ opacity: 1 }}>.</span>
      <span style={{ opacity: active !== 1 ? 1 : 0 }}>.</span>
      <span style={{ opacity: active === 3 ? 1 : 0 }}>.</span>
    </span>
  );
}
