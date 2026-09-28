import React from "react";
import ReactDOM from "react-dom";
// A hover-and-focus popover for a single trigger element. It is portalled to the body and placed
// against the trigger's box, so a card's rounding, overflow or stacking order cannot clip it.
export function Tooltip({ content: content, children: children, delay = 120 }) {
  const uid = React.useId(),
    timer = React.useRef(),
    [spot, setSpot] = React.useState(null);
  const hide = React.useCallback(() => {
    (clearTimeout(timer.current), setSpot(null));
  }, []);
  const show = (el) => {
    (clearTimeout(timer.current),
      (timer.current = setTimeout(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect(),
          pad = 120;
        setSpot({
          x: Math.min(
            Math.max(r.left + r.width / 2, pad),
            window.innerWidth - pad,
          ),
          y: r.top,
        });
      }, delay)));
  };
  if (
    (React.useEffect(() => () => clearTimeout(timer.current), []),
    React.useEffect(() => {
      if (!spot) return;
      const away = () => hide(),
        key = (e) => {
          e.key === "Escape" && hide();
        };
      return (
        window.addEventListener("scroll", away, !0),
        window.addEventListener("resize", away),
        document.addEventListener("keydown", key),
        () => {
          (window.removeEventListener("scroll", away, !0),
            window.removeEventListener("resize", away),
            document.removeEventListener("keydown", key));
        }
      );
    }, [spot, hide]),
    !content)
  )
    return children;
  const trigger = React.cloneElement(children, {
    "aria-describedby": spot ? uid : void 0,
    onMouseEnter: (e) => {
      var p;
      (show(e.currentTarget),
        (p = children.props.onMouseEnter) == null || p(e));
    },
    onMouseLeave: (e) => {
      var p;
      (hide(), (p = children.props.onMouseLeave) == null || p(e));
    },
    onFocus: (e) => {
      var p;
      (show(e.currentTarget), (p = children.props.onFocus) == null || p(e));
    },
    onBlur: (e) => {
      var p;
      (hide(), (p = children.props.onBlur) == null || p(e));
    },
  });
  return (
    <>
      {trigger}
      {spot
        ? ReactDOM.createPortal(
            <div
              id={uid}
              role="tooltip"
              style={{
                left: spot.x,
                top: spot.y,
                transform: "translate(-50%, -100%)",
              }}
              className="pointer-events-none fixed z-[60] pb-2 animate-fade-in"
            >
              <div className="max-w-xs rounded-btn bg-navy px-2.5 py-2 text-left text-xs leading-snug text-navy-fg shadow-pop">
                {content}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
