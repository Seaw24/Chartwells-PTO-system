import React from "react";
import { Modal } from "../ui/Modal.jsx";
import { Button } from "../ui/Button.jsx";
import { Tooltip } from "../ui/Tooltip.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useCurrentUser } from "../../context/AuthContext.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import { useToast } from "../ui/Toast.jsx";
import { initials } from "../../utils/constants.jsx";
import { firstName } from "../../utils/constants.jsx";
import { ROLE_META } from "../../utils/constants.jsx";
import { fmtDateTime } from "../../utils/dateHelpers.jsx";
import { fmtShort } from "../../utils/dateHelpers.jsx";
import { requestStampSlots } from "../../utils/requestHelpers.jsx";
import { stampAction } from "../../utils/requestHelpers.jsx";
import { stampBlockedReason } from "../../utils/requestHelpers.jsx";
import { SLOT_LABEL } from "../../utils/requestHelpers.jsx";
import { Zap as Vendor_Zap } from "lucide-react";

const SLOT_RING_LABEL = { team: "TEAM ADMIN", god: "GOD ADMIN" };
// Who pressed a stamp. request_stamp_facts() puts the name on the row precisely because the roster
// a viewer may read does not always contain them — an employee's roster is themselves alone — so
// the row wins and the catalog is only a fallback for rows fetched before the migration landed.
export const stamperName = (state, userById) =>
  state.byName ?? (state.by ? userById(state.by)?.name : null);
export const stamperRole = (state, userById) =>
  state.byRole ?? (state.by ? userById(state.by)?.role : null);
// Copy for the two seals, so the card, the modal and the requester's own list all read the same.
export function slotSummary(slot, state, userById) {
  const who = state.by ? (stamperName(state, userById) ?? "Someone") : null;
  switch (state.state) {
    case "stamped":
      return `${who} stamped this ${fmtDateTime(state.at)}`;
    case "override":
      return state.overrideOf || state.overrideOfName
        ? `${who} overrode ${state.overrideOfName ?? userById(state.overrideOf)?.name ?? "a stamp"} ${fmtDateTime(state.at)}`
        : `${who} stamped for the team ${fmtDateTime(state.at)}`;
    case "denied":
      return `${who} denied this ${fmtDateTime(state.at)}`;
    case "na":
      return slot === "team"
        ? "No team admin can approve this one"
        : "No other god admin can approve this one";
    default:
      return slot === "team"
        ? "Waiting on a team admin"
        : "Waiting on a god admin";
  }
}

// ---- Seal geometry. All of it is fixed, so it is built once at module load. ----
const at = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
};
const xy = (r, deg) => at(r, deg).map((n) => n.toFixed(2));
// A ring of tangent semicircles: the notched edge that makes a disc read as a pressed seal.
function scallopPath(extent, bumps) {
  const inner = extent / (1 + Math.sin(Math.PI / bumps)),
    bump = (inner * Math.sin(Math.PI / bumps)).toFixed(2);
  let d = `M${xy(inner, 0).join(" ")}`;
  for (let i = 1; i <= bumps; i++)
    d += `A${bump} ${bump} 0 0 1 ${xy(inner, (i * 360) / bumps).join(" ")}`;
  return `${d}Z`;
}
function starPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.44 : r,
      a = ((i * 36 - 90) * Math.PI) / 180;
    pts.push(
      `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`,
    );
  }
  return `M${pts.join("L")}Z`;
}
const SCALLOP = scallopPath(48, 24),
  // Two arcs for the curved band text, each offset so its glyphs land between the inner and outer
  // rings: the top one grows outwards from its baseline, the lower one inwards. The lower arc also
  // runs anticlockwise, which is what keeps the date the right way up.
  TOP_R = 33.5,
  BOTTOM_R = 40.5,
  ARC_TOP = `M${xy(TOP_R, 285).join(" ")}A${TOP_R} ${TOP_R} 0 0 1 ${xy(TOP_R, 75).join(" ")}`,
  ARC_BOTTOM = `M${xy(BOTTOM_R, 235).join(" ")}A${BOTTOM_R} ${BOTTOM_R} 0 0 0 ${xy(BOTTOM_R, 125).join(" ")}`,
  BAND_STARS = [90, 270].map((deg) => starPath(...at(37, deg), 2.9)),
  // Background-coloured strokes lifted off the ink, so the seal looks pressed rather than printed.
  WEAR = [
    "M18 30C34 24 58 27 84 21",
    "M12 58C33 66 62 55 88 62",
    "M26 82C44 74 66 80 82 73",
  ],
  SEAL_PX = { sm: 62, md: 88 },
  // Curved band text needs roughly 8px on screen to stay readable, so only the big seal carries its
  // own label; the compact one borrows a caption instead.
  sealPx = (size) => SEAL_PX[size] ?? SEAL_PX.md,
  hasRingText = (size) => sealPx(size) >= 80,
  TONE = {
    stamped: "text-success-ink",
    override: "text-warning-ink",
    denied: "text-danger-ink",
    na: "text-ink-mute",
    waiting: "text-ink-mute",
  };

// The seal face. Purely presentational: it takes a slot state and draws it.
export function Seal({ slot, state, name, size }) {
  const uid = React.useId(),
    px = sealPx(size),
    detail = hasRingText(size),
    pressed = state.state === "stamped" || state.state === "override",
    settled = pressed || state.state === "denied",
    tilt = settled ? (slot === "team" ? -6 : 5) : 0;
  return (
    <span
      className={`relative block shrink-0 ${TONE[state.state] ?? TONE.waiting}`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        role="presentation"
        aria-hidden="true"
        className="overflow-visible"
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        <defs>
          <path id={`${uid}-top`} d={ARC_TOP} fill="none" />
          <path id={`${uid}-bottom`} d={ARC_BOTTOM} fill="none" />
          <clipPath id={`${uid}-face`}>
            <circle cx="50" cy="50" r="48" />
          </clipPath>
        </defs>
        {settled ? (
          <>
            <path d={SCALLOP} fill="currentColor" opacity="0.09" />
            <path
              d={SCALLOP}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              opacity="0.9"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
              opacity="0.65"
            />
            <circle
              cx="50"
              cy="50"
              r="31.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              opacity="0.85"
            />
            <circle
              cx="50"
              cy="50"
              r="28.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.55"
            />
          </>
        ) : (
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeDasharray="4.5 3.6"
            strokeLinecap="round"
            opacity="0.6"
          />
        )}
        {detail && (
          <g fill="currentColor">
            <text
              fontSize="9.6"
              fontWeight="700"
              letterSpacing="0.9"
              textAnchor="middle"
              opacity={settled ? 0.95 : 0.7}
            >
              <textPath href={`#${uid}-top`} startOffset="50%">
                {SLOT_RING_LABEL[slot]}
              </textPath>
            </text>
            <text
              fontSize="8.6"
              fontWeight="700"
              letterSpacing="1.1"
              textAnchor="middle"
              opacity={settled ? 0.85 : 0.65}
            >
              <textPath href={`#${uid}-bottom`} startOffset="50%">
                {settled
                  ? fmtShort(state.at).toUpperCase()
                  : state.state === "na"
                    ? "NOT NEEDED"
                    : "AWAITING"}
              </textPath>
            </text>
            {settled &&
              BAND_STARS.map((d) => <path key={d} d={d} opacity="0.75" />)}
          </g>
        )}
        {state.state === "denied" ? (
          <g transform="rotate(-17 50 50)">
            <rect
              x="9"
              y="41.5"
              width="82"
              height="17"
              rx="2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            {/* Letter spacing trails the last glyph, so nudge the word back by half of it. */}
            <text
              x="50"
              y="50"
              dx="0.9"
              fontSize="12.5"
              fontWeight="800"
              letterSpacing="1.8"
              textAnchor="middle"
              dominantBaseline="central"
              fill="currentColor"
            >
              {"DENIED"}
            </text>
          </g>
        ) : pressed ? (
          <text
            x="50"
            y="50"
            fontSize={initials(name).length > 2 ? 17 : 21}
            fontWeight="800"
            letterSpacing="0.5"
            textAnchor="middle"
            dominantBaseline="central"
            fill="currentColor"
          >
            {initials(name) || "✓"}
          </text>
        ) : state.state === "na" ? (
          <g
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.5"
          >
            <line x1="41" y1="41" x2="59" y2="59" />
            <line x1="59" y1="41" x2="41" y2="59" />
          </g>
        ) : (
          <path
            d="M40 51l7 7 14-15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.28"
          />
        )}
        {settled && (
          <g
            clipPath={`url(#${uid}-face)`}
            stroke="var(--c-card)"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          >
            {WEAR.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        )}
      </svg>
      {state.state === "override" && (
        <Vendor_Zap
          className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-card p-0.5 text-warning-ink"
          aria-hidden="true"
        />
      )}
    </span>
  );
}

// What the seal did, told from the seal's point of view, since the name is already the heading.
function sealDeed(slot, state, userById) {
  switch (state.state) {
    case "stamped":
      return `Stamped ${fmtDateTime(state.at)}`;
    case "override":
      return state.overrideOf || state.overrideOfName
        ? `Overrode ${state.overrideOfName ?? userById(state.overrideOf)?.name ?? "an earlier stamp"} ${fmtDateTime(state.at)}`
        : `Stamped for the team ${fmtDateTime(state.at)}`;
    case "denied":
      return `Denied ${fmtDateTime(state.at)}`;
    case "na":
      return slot === "team"
        ? "No team admin can approve this one"
        : "No other god admin can approve this one";
    default:
      return slot === "team"
        ? "Waiting on a team admin"
        : "Waiting on a god admin";
  }
}
// The hover card: who pressed the seal, in what capacity, and when. Identical for every viewer —
// only the closing line, what this viewer may do about it, changes.
function SealHover({ slot, state, name, role, userById, hint }) {
  const roleLabel = role ? ROLE_META[role]?.label : null;
  return (
    <div>
      <p className="font-semibold text-navy-fg">
        {name ?? (slot === "team" ? "Team admin stamp" : "God admin stamp")}
      </p>
      {roleLabel && <p className="text-navy-fg-mute">{roleLabel}</p>}
      <p className="mt-1 text-navy-fg-mute">
        {sealDeed(slot, state, userById)}
      </p>
      {hint && <p className="mt-1 font-medium text-navy-fg">{hint}</p>}
    </div>
  );
}

// The two stamp holders. A click presses or lifts a seal straight away; the only dialog left is a
// god admin reaching into a stamp somebody else pressed, which that person cannot undo alone.
export function StampSlots({ request, size = "md", className = "" }) {
  const me = useCurrentUser(),
    { users: users, userById: userById } = useCatalog(),
    { stampRequest: stampRequest, unstampRequest: unstampRequest } =
      useDataSource(),
    toast = useToast(),
    [ask, setAsk] = React.useState(null),
    [busy, setBusy] = React.useState(null),
    slots = requestStampSlots(request, users),
    requester = userById(request.userId);

  const run = async (slot, mode, override) => {
    setBusy(slot);
    try {
      if (mode === "remove") {
        (await unstampRequest(request.id, slot),
          toast(
            request.status === "denied"
              ? "Denial taken back — the request is pending again."
              : "Stamp removed.",
            { kind: "info" },
          ));
      } else
        (await stampRequest(request.id, slot, override),
          toast(
            override
              ? "Stamped in the team admin's place."
              : `Stamped ${firstName(requester?.name) || "this"}'s request.`,
            { kind: "success" },
          ));
      setAsk(null);
    } catch (error) {
      toast(error.message, { kind: "error" });
    } finally {
      setBusy(null);
    }
  };

  const click = (slot, action, blocked) => {
    // Everyone gets the same seals, so a click somebody is not allowed to make says why in the
    // usual toast rather than being quietly ignored.
    if (!action) {
      toast(blocked, { kind: "error" });
      return;
    }
    if (!action.needsConfirm) {
      run(slot, action.mode, action.override);
      return;
    }
    const state = slots[slot];
    setAsk({
      slot: slot,
      action: action,
      denied: state.state === "denied",
      who: stamperName(state, userById) ?? "Another admin",
      at: state.at,
    });
  };

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {["team", "god"].map((slot) => {
        const state = slots[slot],
          name = stamperName(state, userById),
          role = stamperRole(state, userById),
          action = stampAction(me, request, slot, users),
          blocked = action
            ? null
            : stampBlockedReason(me, request, slot, users),
          hint = action
            ? action.mode === "remove"
              ? state.state === "denied"
                ? "Click to take the denial back"
                : "Click to lift it off"
              : action.override
                ? "Click to stamp for the team"
                : "Click to stamp"
            : blocked,
          label = slotSummary(slot, state, userById);
        return (
          <div className="flex flex-col items-center gap-1" key={slot}>
            <Tooltip
              content={
                <SealHover
                  slot={slot}
                  state={state}
                  name={name}
                  role={role}
                  userById={userById}
                  hint={hint}
                />
              }
            >
              <button
                type="button"
                disabled={busy === slot}
                onClick={(e) => {
                  (e.stopPropagation(), click(slot, action, blocked));
                }}
                aria-label={`${SLOT_LABEL[slot]} approval — ${label}. ${hint}.`}
                className={`rounded-full transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  busy === slot
                    ? "animate-pulse opacity-50"
                    : action
                      ? "cursor-pointer hover:scale-110"
                      : "cursor-pointer"
                }`}
              >
                <Seal slot={slot} state={state} name={name} size={size} />
              </button>
            </Tooltip>
            {!hasRingText(size) && (
              <span className="text-[10px] font-semibold tracking-wide text-ink-mute">
                {SLOT_LABEL[slot]}
              </span>
            )}
          </div>
        );
      })}
      <Modal
        open={!!ask}
        onClose={() => setAsk(null)}
        title={ask?.denied ? "Take this denial back?" : "Take this stamp off?"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAsk(null)}>
              {"Cancel"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!!busy}
              onClick={() => run(ask.slot, "remove", !1)}
            >
              {ask?.denied ? "Take the denial back" : "Take their stamp off"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-mute">
          {ask?.denied
            ? `${ask.who} denied this ${fmtDateTime(ask.at)}${
                request.denialReason ? ` — “${request.denialReason}”` : ""
              }. Taking it back discards that reason and sends the request to pending.`
            : ask
              ? `${ask.who} stamped this ${fmtDateTime(ask.at)}. Taking it off sends the slot back to waiting${
                  request.status === "approved"
                    ? " and the request back to pending"
                    : ""
                }.`
              : ""}
        </p>
      </Modal>
    </div>
  );
}
