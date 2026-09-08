import { useCatalog } from "../../context/CatalogContext.jsx";
import { windowedTypes } from "../../utils/policyEngine.jsx";
import { blackoutTypes } from "../../utils/policyEngine.jsx";
import { isInWindow } from "../../utils/policyEngine.jsx";
import { windowsForType } from "../../utils/policyEngine.jsx";
import { toISO } from "../../utils/dateHelpers.jsx";
import { toDateLocal } from "../../utils/dateHelpers.jsx";
import React from "react";
import { addMonths as Vendor_addMonths } from "date-fns";
import { blackoutOnDate } from "../../utils/policyEngine.jsx";
import { dateTypeMarks } from "../../utils/policyEngine.jsx";
import { addDays as Vendor_addDays } from "date-fns";
import { startOfWeek as Vendor_startOfWeek } from "date-fns";
import { endOfWeek as Vendor_endOfWeek } from "date-fns";
import { isSameMonth as Vendor_isSameMonth } from "date-fns";
import { isBefore as Vendor_isBefore } from "date-fns";
import { startOfMonth as Vendor_startOfMonth } from "date-fns";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
import { fmtMonth } from "../../utils/dateHelpers.jsx";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { WEEKDAY_LABELS } from "../../utils/dateHelpers.jsx";
import { monthGrid } from "../../utils/dateHelpers.jsx";
import { format as Vendor_format } from "date-fns";
import { fmtShort } from "../../utils/dateHelpers.jsx";
export const iS = (e) => `color-mix(in oklch, ${e} 20%, var(--c-card))`;
export const Cp = (e) =>
  `${e.name} ${e.kind === "blackout" ? "blackout" : "window"}`;
export const Rp = (e, t) =>
  e <= t
    ? {
        start: e,
        end: t,
      }
    : {
        start: t,
        end: e,
      };
export const aS = (e) =>
  Array.from(
    {
      length: Math.ceil(e.length / 7),
    },
    (t, n) => e.slice(n * 7, n * 7 + 7),
  );
export function DateRangePicker({
  value: value,
  onChange: onChange,
  typeId: typeId,
  todayIso: todayIso,
  allowPast = !1,
  bookedDays = {},
}) {
  const {
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
      ptoTypeById: ptoTypeById,
    } = useCatalog(),
    h = windowedTypes(ptoTypes, dateRules),
    d = blackoutTypes(ptoTypes, blackouts),
    f = {
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
    },
    p = ptoTypeById(typeId),
    y = !!(p != null && p.restrictedDates),
    g = (() => {
      const K = (value == null ? void 0 : value.start) || todayIso;
      if (
        y &&
        !(value != null && value.start) &&
        !isInWindow(K, typeId, dateRules)
      ) {
        const A = windowsForType(typeId, dateRules);
        if (A != null && A.length) return A[0].start;
      }
      return toISO(toDateLocal(K));
    })(),
    [k, v] = React.useState(() => toDateLocal(g)),
    [m, x] = React.useState(g),
    [b, N] = React.useState(() =>
      value != null && value.start && value.start === (value.end || value.start)
        ? value.start
        : null,
    ),
    [_, j] = React.useState(null),
    [S, R] = React.useState(() =>
      typeof window < "u" && window.matchMedia("(min-width: 640px)").matches
        ? 2
        : 1,
    ),
    E = React.useRef(null),
    T = React.useRef(!1);
  (React.useEffect(() => {
    const K = window.matchMedia("(min-width: 640px)"),
      A = () => R(K.matches ? 2 : 1);
    return (
      A(),
      K.addEventListener("change", A),
      () => K.removeEventListener("change", A)
    );
  }, []),
    React.useEffect(() => {
      (value != null && value.start) || N(null);
    }, [value == null ? void 0 : value.start]));
  const C = React.useMemo(
      () =>
        Array.from(
          {
            length: S,
          },
          (K, A) => Vendor_addMonths(k, A),
        ),
      [k, S],
    ),
    H = toISO(new Date(toDateLocal(todayIso).getTime() - 864e5)),
    I = allowPast ? H : todayIso,
    D = !!b,
    q = D
      ? Rp(b, _ || m)
      : value != null && value.start
        ? {
            start: value.start,
            end: value.end || value.start,
          }
        : null;
  function Z(K) {
    const A = toISO(K),
      B = A < I,
      ae = blackoutOnDate(A, blackouts),
      fe =
        !!ae &&
        (ae.scope === "all" || (!!typeId && ae.typeIds.includes(typeId))),
      ye = y && !isInWindow(A, typeId, dateRules),
      Q = B || fe || ye,
      Y = (q == null ? void 0 : q.start) === A,
      ee = (q == null ? void 0 : q.end) === A,
      Pe = !!q && A > q.start && A < q.end,
      ve = !y && !Q ? dateTypeMarks(K, f) : [],
      _e = bookedDays[A] || null;
    return {
      iso: A,
      disabled: Q,
      blackout: fe,
      outOfWindow: ye,
      typeMarks: ve,
      booked: _e,
      inRange: Pe,
      isStart: Y,
      isEnd: ee,
      isToday: A === todayIso,
    };
  }
  function P(K) {
    const { disabled: disabled, iso: iso } = Z(K);
    if (!disabled) {
      if (D) {
        (onChange(Rp(b, iso)), N(null));
        return;
      }
      (onChange({
        start: iso,
        end: iso,
      }),
        N(iso),
        j(iso));
    }
  }
  function $(K) {
    const A = toDateLocal(m);
    let B = null;
    switch (K.key) {
      case "ArrowLeft":
        B = Vendor_addDays(A, -1);
        break;
      case "ArrowRight":
        B = Vendor_addDays(A, 1);
        break;
      case "ArrowUp":
        B = Vendor_addDays(A, -7);
        break;
      case "ArrowDown":
        B = Vendor_addDays(A, 7);
        break;
      case "Home":
        B = Vendor_startOfWeek(A, {
          weekStartsOn: 0,
        });
        break;
      case "End":
        B = Vendor_endOfWeek(A, {
          weekStartsOn: 0,
        });
        break;
      case "PageUp":
        B = Vendor_addMonths(A, -1);
        break;
      case "PageDown":
        B = Vendor_addMonths(A, 1);
        break;
      case "Enter":
      case " ":
        (K.preventDefault(), P(A));
        return;
      default:
        return;
    }
    (K.preventDefault(),
      (T.current = !0),
      C.some((ae) => Vendor_isSameMonth(B, ae)) ||
        v(
          Vendor_isBefore(B, Vendor_startOfMonth(k))
            ? Vendor_addMonths(k, -1)
            : Vendor_addMonths(k, 1),
        ),
      j(null),
      x(toISO(B)));
  }
  React.useEffect(() => {
    var K, A;
    T.current &&
      ((T.current = !1),
      (A =
        (K = E.current) == null
          ? void 0
          : K.querySelector(`[data-iso="${m}"]`)) == null || A.focus());
  }, [m]);
  function U(K) {
    const A = Vendor_addMonths(k, K);
    (v(A),
      Array.from(
        {
          length: S,
        },
        (B, ae) => Vendor_addMonths(A, ae),
      ).some((B) => Vendor_isSameMonth(toDateLocal(m), B)) || x(toISO(A)));
  }
  const X = Object.keys(bookedDays).length > 0,
    V = D && q.start !== q.end,
    he = V
      ? "Tap to confirm these dates."
      : D
        ? "One day selected. Tap another day to extend it."
        : q
          ? "Tap any day to start over."
          : "Tap the day you are off. Tap a second day for a range.";
  return (
    <div
      className="rounded-card border border-line bg-card p-3"
      onMouseLeave={() => j(null)}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => U(-1)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-soft transition-colors hover:bg-panel"
          aria-label="Previous month"
        >
          <Vendor_ChevronLeft size={18} />
        </button>
        <div
          className="flex min-w-0 flex-1 justify-around gap-2"
          aria-live="polite"
        >
          {C.map((K) => (
            <span
              className="truncate text-sm font-bold text-ink"
              key={toISO(K)}
            >
              {fmtMonth(K)}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => U(1)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-soft transition-colors hover:bg-panel"
          aria-label="Next month"
        >
          <Vendor_ChevronRight size={18} />
        </button>
      </div>
      <div ref={E} onKeyDown={$} className="flex gap-4">
        {C.map((K) => (
          <div
            role="grid"
            aria-label={`${fmtMonth(K)}, choose dates`}
            className="grid flex-1 grid-cols-7 gap-y-px text-center"
            key={toISO(K)}
          >
            <div role="row" className="contents">
              {WEEKDAY_LABELS.map((A) => (
                <div
                  role="columnheader"
                  className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-mute"
                  key={A}
                >
                  {A[0]}
                </div>
              ))}
            </div>
            {aS(monthGrid(K)).map((A) => {
              const B = A.map((fe) =>
                  Vendor_isSameMonth(fe, K) ? Z(fe) : null,
                ),
                ae = B.map(
                  (fe) => !!fe && (fe.isStart || fe.isEnd || fe.inRange),
                );
              return (
                <div role="row" className="contents" key={toISO(A[0])}>
                  {A.map((fe, ye) => {
                    var W;
                    const Q = B[ye];
                    if (!Q)
                      return (
                        <div
                          className="h-9"
                          aria-hidden="true"
                          key={toISO(fe)}
                        />
                      );
                    const Y = Q.isStart || Q.isEnd,
                      ee = Y && D && Q.iso !== b,
                      Pe = Y && !ee,
                      ve = ae[ye] && !ae[ye - 1],
                      _e = ae[ye] && !ae[ye + 1],
                      Mt = Q.booked
                        ? (W = ptoTypeById(Q.booked.typeId)) == null
                          ? void 0
                          : W.color
                        : null,
                      mt =
                        Mt && !ae[ye]
                          ? {
                              background: `color-mix(in oklch, ${Mt} ${Q.booked.status === "pending" ? 9 : 16}%, var(--c-card))`,
                              border:
                                Q.booked.status === "pending"
                                  ? `1px dashed color-mix(in oklch, ${Mt} 55%, transparent)`
                                  : `1px solid color-mix(in oklch, ${Mt} 30%, transparent)`,
                            }
                          : void 0,
                      jt = Q.booked
                        ? Q.booked.status === "pending"
                          ? "you already requested this day"
                          : "you are already off this day"
                        : "";
                    return (
                      <button
                        type="button"
                        data-iso={Q.iso}
                        role="gridcell"
                        tabIndex={Q.iso === m ? 0 : -1}
                        aria-disabled={Q.disabled || void 0}
                        aria-selected={Y || Q.inRange || void 0}
                        aria-label={`${Vendor_format(fe, "EEEE, MMMM d, yyyy")}${Q.blackout ? ", blackout, unavailable" : Q.outOfWindow ? ", outside allowed window" : Q.typeMarks.length ? `, ${Q.typeMarks.map(Cp).join(", ")}` : ""}${jt ? `, ${jt}` : ""}`}
                        onClick={() => P(fe)}
                        onFocus={() => x(Q.iso)}
                        onMouseEnter={() => j(Q.iso)}
                        title={
                          Q.blackout
                            ? "Blackout period, unavailable"
                            : Q.outOfWindow
                              ? "Outside the allowed window"
                              : jt
                                ? `You ${Q.booked.status === "pending" ? "have already requested" : "are already off"} this day`
                                : Q.typeMarks.length
                                  ? Q.typeMarks.map(Cp).join(", ")
                                  : void 0
                        }
                        style={mt}
                        className={[
                          "relative flex h-9 items-center justify-center text-sm font-medium transition-colors duration-[120ms]",
                          ae[ye] ? "" : "rounded-chip",
                          ve ? "rounded-l-btn" : "",
                          _e ? "rounded-r-btn" : "",
                          Q.inRange && !Y ? "bg-accent-soft" : "",
                          Pe ? "bg-accent-strong font-bold text-white" : "",
                          ee
                            ? "bg-accent-soft font-bold text-accent-ink ring-2 ring-inset ring-accent"
                            : "",
                          Q.disabled
                            ? "cursor-not-allowed text-ink-mute/45"
                            : Y || Q.inRange
                              ? ""
                              : "text-ink hover:bg-panel",
                          Q.blackout ? "hatch-danger" : "",
                        ].join(" ")}
                        key={Q.iso}
                      >
                        {Vendor_format(fe, "d")}
                        {Q.isToday && !Y && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent-strong" />
                        )}
                        {!Y && !Q.inRange && Q.typeMarks.length > 0 && (
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-b-chip">
                            {Q.typeMarks.map((we) => (
                              <span
                                className={
                                  we.kind === "blackout"
                                    ? "hatch-type h-[4px] w-full"
                                    : "h-[3px] w-full"
                                }
                                style={
                                  we.kind === "blackout"
                                    ? {
                                        "--hatch-ink": we.color,
                                      }
                                    : {
                                        background: we.color,
                                      }
                                }
                                key={`${we.kind}:${we.id}`}
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-1 text-[11px] text-ink-mute">
        <p aria-live="polite">
          {V && (
            <span className="mr-1.5 font-semibold text-ink-soft">
              {fmtShort(q.start)}
              {" – "}
              {fmtShort(q.end)}
            </span>
          )}
          {he}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {h.map((K) => (
            <span className="flex items-center gap-1.5" key={K.id}>
              <span
                className="h-3 w-4 rounded-chip"
                style={{
                  background: iS(K.color),
                }}
                aria-hidden="true"
              />{" "}
              {K.name}
              {" window"}
            </span>
          ))}
          {d.map((K) => (
            <span className="flex items-center gap-1.5" key={K.id}>
              <span
                className="hatch-type h-3 w-4 rounded-chip"
                style={{
                  "--hatch-ink": K.color,
                }}
                aria-hidden="true"
              />{" "}
              {K.name}
              {" blackout"}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-4 rounded-chip hatch-danger"
              aria-hidden="true"
            />
            {" Blackout"}
          </span>
          {X && (
            <span className="flex items-center gap-1.5">
              <span
                className="h-3 w-4 rounded-chip border border-ink-mute/45 bg-panel"
                aria-hidden="true"
              />
              {" Already off"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
