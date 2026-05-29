// Design notes: A calm navy field with one dot-grid texture (the brief bans large
//   decorative gradients and glass, so the v1 blobs are gone). A single focused card,
//   honest demo helper text, one primary action. Premium by restraint, not effects.
// References: Linear/Vercel auth screens; the brief's hard bans.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(e) {
    e.preventDefault();
    navigate('/');
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-navy px-4 py-10">
      {/* A single restrained dot-grid texture on the navy field — no decorative
          gradient blobs, no glass. The card carries the screen. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--c-navy-fg) 1px, transparent 0)',
          backgroundSize: '26px 26px',
        }}
      />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-strong text-white shadow-lift">
            <CalendarDays size={28} />
          </span>
          <h1 className="text-2xl font-bold text-navy-fg">Chartwells PTO</h1>
          <p className="mt-1.5 text-sm text-navy-fg-mute">Time off, made simple.</p>
        </div>

        <form onSubmit={submit} className="rounded-modal bg-card p-6 shadow-pop">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@chartwells.com"
                className="w-full rounded-btn border border-line bg-card px-3.5 py-2.5 text-sm text-ink transition-shadow placeholder:text-ink-mute focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-btn border border-line bg-card px-3.5 py-2.5 text-sm text-ink transition-shadow placeholder:text-ink-mute focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
              />
            </label>
          </div>

          <Button type="submit" variant="primary" size="lg" className="mt-6 w-full">
            Sign In <ArrowRight size={18} />
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-navy-fg-mute">
          Demo mode: use any credentials. Switch roles from the toolbar after signing in.
        </p>
      </div>
    </div>
  );
}
