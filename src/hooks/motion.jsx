import React from "react";
export const prefersReducedMotion = () => {
  var e;
  return (
    typeof window < "u" &&
    !!(
      (e = window.matchMedia) != null &&
      e.call(window, "(prefers-reduced-motion: reduce)").matches
    )
  );
};
export function usePresence(e, t = 140) {
  const [n, r] = React.useState(e ? "open" : "closed"),
    s = React.useRef();
  return (
    React.useEffect(() => {
      if ((clearTimeout(s.current), e)) {
        r("open");
        return;
      }
      return (
        r((i) => (i === "closed" ? "closed" : "closing")),
        (s.current = setTimeout(
          () => r("closed"),
          prefersReducedMotion() ? 0 : t,
        )),
        () => clearTimeout(s.current)
      );
    }, [e, t]),
    {
      mounted: n !== "closed",
      closing: n === "closing",
    }
  );
}
export function useEntered() {
  const [e, t] = React.useState(!1);
  return (
    React.useEffect(() => {
      const n = requestAnimationFrame(() => t(!0));
      return () => cancelAnimationFrame(n);
    }, []),
    e
  );
}
export function useCountUp(e, t = 620) {
  const [n, r] = React.useState(() => (prefersReducedMotion() ? e : 0)),
    s = React.useRef(prefersReducedMotion() ? e : 0);
  return (
    React.useEffect(() => {
      if (prefersReducedMotion()) {
        ((s.current = e), r(e));
        return;
      }
      const i = s.current,
        o = e - i;
      if (o === 0) return;
      const c = performance.now();
      let l;
      const u = (h) => {
        const d = Math.min(1, (h - c) / t),
          f = 1 - Math.pow(1 - d, 4);
        ((s.current = i + o * f),
          r(Math.round(s.current)),
          d < 1 ? (l = requestAnimationFrame(u)) : (s.current = e));
      };
      return ((l = requestAnimationFrame(u)), () => cancelAnimationFrame(l));
    }, [e, t]),
    n
  );
}
