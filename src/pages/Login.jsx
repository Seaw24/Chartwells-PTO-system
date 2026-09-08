import { useNavigate as Vendor_useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import React from "react";
import { CalendarDays as Vendor_CalendarDays } from "lucide-react";
import { EyeOff as Vendor_EyeOff } from "lucide-react";
import { Eye as Vendor_Eye } from "lucide-react";
import { CircleAlert as Vendor_CircleAlert } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { ArrowRight as Vendor_ArrowRight } from "lucide-react";
export function Login() {
  const e = Vendor_useNavigate(),
    { user: user, signIn: signIn, error: error } = useAuth(),
    [s, i] = React.useState(""),
    [o, c] = React.useState(""),
    [l, u] = React.useState(!1),
    [h, d] = React.useState(!1),
    [f, p] = React.useState(null);
  React.useEffect(() => {
    user &&
      e(user.passwordSetupRequired ? "/welcome" : "/", {
        replace: !0,
      });
  }, [user, e]);
  async function y(g) {
    if ((g.preventDefault(), p(null), !s.trim() || !o)) {
      p("Enter your email and password.");
      return;
    }
    d(!0);
    try {
      await signIn(s, o);
    } catch (k) {
      p(k.message);
    } finally {
      d(!1);
    }
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--c-navy-fg) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="relative flex items-center gap-2.5 text-navy-fg">
          <span className="grid h-9 w-9 place-items-center rounded-btn bg-accent-strong text-white shadow-lift">
            <Vendor_CalendarDays size={18} />
          </span>
          <span className="font-semibold tracking-tight">
            {"Chartwells PTO"}
          </span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-navy-fg">
            {"Time off, made simple."}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-navy-fg-mute">
            {
              "Request leave, track balances, and keep shift coverage clear — all in one place for the team."
            }
          </p>
        </div>
        <p className="relative text-xs text-navy-fg-mute">
          {"Internal tool · Chartwells dining services"}
        </p>
      </div>
      <div className="grid place-items-center bg-surface px-6 py-10">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-btn bg-accent-strong text-white shadow-lift">
              <Vendor_CalendarDays size={18} />
            </span>
            <span className="font-semibold tracking-tight text-ink">
              {"Chartwells PTO"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {"Sign in"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-mute">
            {"Welcome back. Enter your details to continue."}
          </p>
          <form onSubmit={y} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                {"Email"}
              </span>
              <input
                type="email"
                value={s}
                onChange={(g) => i(g.target.value)}
                placeholder="you@chartwells.com"
                className="w-full rounded-btn border border-line bg-card px-3.5 py-2.5 text-sm text-ink transition-shadow placeholder:text-ink-mute focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                {"Password"}
              </span>
              <div className="relative">
                <input
                  type={l ? "text" : "password"}
                  value={o}
                  onChange={(g) => c(g.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-btn border border-line bg-card px-3.5 py-2.5 pr-11 text-sm text-ink transition-shadow placeholder:text-ink-mute focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
                />
                <button
                  type="button"
                  onClick={() => u((g) => !g)}
                  aria-label={l ? "Hide password" : "Show password"}
                  className="press absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-btn text-ink-mute hover:text-ink"
                >
                  {l ? <Vendor_EyeOff size={17} /> : <Vendor_Eye size={17} />}
                </button>
              </div>
            </label>
            {(f || error) && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-btn bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"
              >
                <Vendor_CircleAlert size={16} className="mt-0.5 shrink-0" />
                <span>{f || error}</span>
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={h}
              className="mt-2 w-full"
            >
              {h ? (
                "Signing in…"
              ) : (
                <>
                  {"Sign In "}
                  <Vendor_ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
          <p className="mt-6 text-xs leading-relaxed text-ink-mute">
            {
              "Use the email and password your manager gave you. If you cannot sign in, ask a God Admin for a new temporary password."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
