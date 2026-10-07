import { useEffect, useState } from "react";

export function useResendCooldown(seconds = 30) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => {
      setRemaining((current) => current - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  return {
    remaining,
    isCoolingDown: remaining > 0,
    start() {
      setRemaining(seconds);
    },
  };
}
