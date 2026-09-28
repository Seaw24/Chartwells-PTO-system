import { useOrg } from "../../context/OrgContext.jsx";
import { useNavigate as Vendor_useNavigate } from "react-router-dom";
import { canManageTeam } from "../../utils/organization.jsx";
import { Drawer } from "../ui/Drawer.jsx";
import { teamInitials } from "../../utils/organization.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { Button } from "../ui/Button.jsx";
import { SquarePen as Vendor_SquarePen } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { RolePill } from "../ui/RolePill.jsx";
export const formatAddedDate = (e) =>
  e
    ? new Date(`${e}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
export function TeamDrawer({
  teamId: teamId,
  open: open,
  onClose: onClose,
  viewer: viewer,
}) {
  const s = useOrg(),
    i = Vendor_useNavigate(),
    o = teamId ? s.teamById(teamId) : null,
    c = o
      ? s
          .membersOf(o.id)
          .slice()
          .sort((d, f) =>
            d.role === f.role
              ? d.name.localeCompare(f.name)
              : d.role === "admin"
                ? -1
                : 1,
          )
      : [],
    l = c.filter((d) => d.role === "admin").length,
    u = canManageTeam(s, viewer, teamId),
    h = (d) => {
      var f;
      return d === (viewer == null ? void 0 : viewer.id)
        ? "you"
        : ((f = s.personById(d)) == null ? void 0 : f.name) || "someone";
    };
  return (
    <Drawer
      open={open && !!o}
      onClose={onClose}
      title={(o == null ? void 0 : o.name) || "Team"}
      subtitle={
        o
          ? `${c.length} ${c.length === 1 ? "member" : "members"}${l ? ` · ${l} admin${l === 1 ? "" : "s"}` : ""}`
          : ""
      }
      icon={
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-panel text-[13px] font-bold tracking-tight text-ink-soft">
          {o ? (
            teamInitials(o.name)
          ) : (
            <Vendor_Users size={18} className="text-ink-mute" />
          )}
        </span>
      }
      footer={
        u ? (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {"Close"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                (onClose == null || onClose(),
                  i(`/settings?tab=teams&team=${teamId}`));
              }}
            >
              <Vendor_SquarePen size={15} />
              {" Edit team"}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onClose}>
            {"Done"}
          </Button>
        )
      }
    >
      {(o == null ? void 0 : o.description) && (
        <p className="mb-5 text-[13px] leading-relaxed text-ink-soft">
          {o.description}
        </p>
      )}
      <h3 className="eyebrow mb-2">{"Members & roles"}</h3>
      {c.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-3 py-8 text-center text-[13px] text-ink-mute">
          {"No one is on this team yet."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {c.map((d) => (
            <li
              className="flex items-center gap-3 rounded-btn border border-line bg-card px-3 py-2"
              key={d.id}
            >
              <Avatar name={d.name} id={d.id} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">
                  {d.name}
                  {d.id === (viewer == null ? void 0 : viewer.id) && (
                    <span className="ml-1.5 font-normal text-ink-mute">
                      {"· you"}
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-ink-mute">
                  {"Added by "}
                  {h(d.addedBy)}
                  {d.addedAt ? ` · ${formatAddedDate(d.addedAt)}` : ""}
                </p>
              </div>
              {d.role === "admin" ? (
                <RolePill role="admin" size="xs" />
              ) : (
                <span className="shrink-0 text-[11px] font-medium text-ink-mute">
                  {"Member"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
