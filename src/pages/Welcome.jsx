import { CalendarDays as Vendor_CalendarDays } from "lucide-react";
import { useNavigate as Vendor_useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import React from "react";
import { CircleAlert as Vendor_CircleAlert } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { Link as Vendor_Link } from "react-router-dom";
import { ArrowRight as Vendor_ArrowRight } from "lucide-react";
import { KeyRound as Vendor_KeyRound } from "lucide-react";
import { EyeOff as Vendor_EyeOff } from "lucide-react";
import { Eye as Vendor_Eye } from "lucide-react";
import { CircleCheck as Vendor_CircleCheck } from "lucide-react";
export function validatePasswords(e, t) {
  return !e || !t
    ? "Enter your new password twice."
    : e !== t
      ? "Those passwords do not match. Try again."
      : null;
}
export function WelcomeBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-btn bg-accent-strong text-navy-fg shadow-lift">
        <Vendor_CalendarDays size={18} />
      </span>
      <span className="font-semibold tracking-tight">{"Chartwells PTO"}</span>
    </div>
  );
}
export function Welcome({ signInRequired = !1 }) {
  const t = Vendor_useNavigate(),
    { user: user, completePasswordSetup: completePasswordSetup } = useAuth(),
    [s, i] = React.useState(""),
    [o, c] = React.useState(""),
    [l, u] = React.useState(!1),
    [h, d] = React.useState(!1),
    [f, p] = React.useState(null);
  async function y(g) {
    g.preventDefault();
    const k = validatePasswords(s, o);
    if ((p(k), !k)) {
      d(!0);
      try {
        (await completePasswordSetup(s),
          t("/", {
            replace: !0,
          }));
      } catch (v) {
        p(v.message);
      } finally {
        d(!1);
      }
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-navy px-4 py-8 sm:px-6">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--c-navy-fg) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />
      <section className="relative w-full max-w-4xl overflow-hidden rounded-modal bg-card shadow-pop lg:grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="bg-navy-700 px-6 py-6 text-navy-fg sm:px-8 lg:flex lg:flex-col lg:justify-between lg:p-10">
          <WelcomeBrand />
          <div className="mt-10 hidden lg:block">
            <p className="eyebrow text-navy-fg-mute">{"Your account"}</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight">
              {"One quick step, then you are in."}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-navy-fg-mute">
              {
                "Your manager has already set up your team and leave access. Create the password you will use from now on."
              }
            </p>
          </div>
          <p className="mt-8 hidden text-xs text-navy-fg-mute lg:block">
            {"Internal tool · Chartwells dining services"}
          </p>
        </div>
        <div className="px-6 py-8 sm:px-10 sm:py-10 lg:p-12">
          {signInRequired ? (
            <div className="max-w-md">
              <span className="grid h-11 w-11 place-items-center rounded-card bg-danger-soft text-danger-ink">
                <Vendor_CircleAlert size={21} />
              </span>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
                {"Sign in to finish setup"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                {
                  "Use the email and temporary password your manager gave you. We will bring you back here to create your own password."
                }
              </p>
              <Button
                as={Vendor_Link}
                to="/login"
                variant="outline"
                size="lg"
                className="mt-7 w-full sm:w-auto"
              >
                {"Go to sign in "}
                <Vendor_ArrowRight size={18} />
              </Button>
            </div>
          ) : (
            <div className="max-w-md">
              <span className="grid h-11 w-11 place-items-center rounded-card bg-accent-soft text-accent-ink">
                <Vendor_KeyRound size={21} />
              </span>
              <p className="eyebrow mt-5">
                {"Welcome, "}
                {user == null ? void 0 : user.name}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
                {"Create your password"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                {
                  "Your temporary password worked. Choose the password you will use with "
                }
                <span className="font-semibold text-ink-soft">
                  {user == null ? void 0 : user.email}
                </span>
                {" from now on."}
              </p>
              <form onSubmit={y} className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    {"New password"}
                  </span>
                  <div className="relative">
                    <input
                      type={l ? "text" : "password"}
                      value={s}
                      onChange={(g) => i(g.target.value)}
                      autoComplete="new-password"
                      aria-invalid={!!f}
                      className="w-full rounded-btn border border-line bg-card px-3.5 py-2.5 pr-11 text-sm text-ink transition-shadow focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
                    />
                    <button
                      type="button"
                      onClick={() => u((g) => !g)}
                      aria-label={l ? "Hide password" : "Show password"}
                      className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-btn text-ink-mute transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {l ? (
                        <Vendor_EyeOff size={17} />
                      ) : (
                        <Vendor_Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    {"Confirm password"}
                  </span>
                  <input
                    type={l ? "text" : "password"}
                    value={o}
                    onChange={(g) => c(g.target.value)}
                    autoComplete="new-password"
                    aria-invalid={!!f}
                    className="w-full rounded-btn border border-line bg-card px-3.5 py-2.5 text-sm text-ink transition-shadow focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
                  />
                </label>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-mute">
                  <Vendor_CircleCheck
                    size={15}
                    className="mt-0.5 shrink-0 text-success"
                  />
                  {"Use a password you do not use for another account."}
                </p>
                {f && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-btn bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"
                  >
                    <Vendor_CircleAlert size={16} className="mt-0.5 shrink-0" />
                    <span>{f}</span>
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
                    "Saving password…"
                  ) : (
                    <>
                      {"Create password "}
                      <Vendor_ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
