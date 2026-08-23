import Link from "next/link";
import { cookies } from "next/headers";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/branding";
import { ProviderLogo } from "@/components/ProviderLogo";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";
import {
  CloudIcon, GamesIcon, ProvidersIcon as LinkIcon2, ZapIcon,
  MonitorPlayIcon, ShieldAlertIcon, GamesIcon as ControllerIcon,
} from "@/components/icons";

export const metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "A personal cloud gaming PC in your browser. Connect Steam, Epic and GOG, stream at 1080p60 with low latency, and play Windows titles via Proton on Linux.",
};

async function isAuthed() {
  try {
    const jar = await cookies();
    const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
    return !!(s && s.userId != null);
  } catch {
    return false;
  }
}

const FEATURES = [
  {
    icon: CloudIcon,
    title: "Your cloud PC, instantly",
    body: "A dedicated GPU rig boots in under a minute. Your desktop, files and games live in the cloud — ready from any browser.",
  },
  {
    icon: LinkIcon2,
    title: "One library, every store",
    body: "Connect Steam, Epic Games and GOG once. Your owned games sync into a single library — visible even before they're installed.",
  },
  {
    icon: GamesIcon,
    title: "Windows games via Proton",
    body: "Native Linux builds install directly; Windows-only titles automatically fetch their Windows version and run through Proton. Every game, one platform.",
  },
  {
    icon: ZapIcon,
    title: "Low-latency streaming",
    body: "Hardware H.264 over WebRTC adapts to your network in real time — 1080p60 that stays smooth when the Wi-Fi doesn't.",
  },
  {
    icon: ControllerIcon,
    title: "Controller-first",
    body: "Plug in any gamepad — input is streamed with sub-frame overhead. Full support for the couch-and-laptop setup.",
  },
  {
    icon: ShieldAlertIcon,
    title: "Private by design",
    body: "Single-user system. Credentials are encrypted at rest, sessions are signed, and your cloud PC talks only to you.",
  },
];

const STEPS = [
  { n: "01", title: "Sign in", body: "Google or password — your KYRO CLOUD account is the hub." },
  { n: "02", title: "Connect your stores", body: "Link Steam / Epic / GOG. Owned games appear in your Library instantly." },
  { n: "03", title: "Install & play", body: "One click installs to your cloud PC — native or via Proton — then hit Play." },
];

export default async function LandingPage() {
  const authed = await isAuthed();
  const primaryHref = authed ? "/home" : "/login";
  const primaryLabel = authed ? "Open App" : "Get Started";

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-bg/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-accent text-on-accent glow-accent flex items-center justify-center font-bold text-sm">K</span>
            <span className="font-display font-bold tracking-tight">{APP_NAME}</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted hover:text-text transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link
              href={primaryHref}
              className="clay-btn bg-accent text-on-accent font-semibold text-sm px-4 py-2 hover:brightness-105 transition-all"
            >
              {primaryLabel}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary-container/15 blur-[140px]" />
          <div className="absolute top-40 -right-40 w-[400px] h-[400px] rounded-full bg-warning/10 blur-[120px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-6">
            Personal cloud gaming · Linux + Proton
          </span>
          <h1 className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Your PC.
            <br />
            <span className="bg-gradient-to-r from-accent via-tertiary to-warning bg-clip-text text-transparent">Anywhere.</span>
          </h1>
          <p className="mt-6 text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            {APP_TAGLINE} Spin up a high-end gaming rig in your browser, link the stores you already own games on,
            and stream them at 1080p60 — native Linux titles and Windows-only hits alike.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={primaryHref}
              className="clay-btn bg-accent text-on-accent font-semibold px-8 py-3 rounded-xl hover:brightness-105 transition-all shadow-glow-primary"
            >
              {primaryLabel} — it&apos;s your machine
            </Link>
            <a href="#how" className="clay-btn bg-secondary text-text px-8 py-3 rounded-xl border border-white/10 font-medium hover:bg-surface-bright transition-all">
              See how it works
            </a>
          </div>

          {/* Hero visual */}
          <div className="mt-16 clay p-2 max-w-4xl mx-auto shadow-clay">
            <div className="rounded-2xl bg-bg-deep aspect-video flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-40" aria-hidden>
                <div className="absolute top-10 left-16 w-64 h-64 rounded-full bg-primary-container/25 blur-[90px]" />
                <div className="absolute bottom-6 right-14 w-72 h-52 rounded-full bg-tertiary/20 blur-[100px]" />
              </div>
              <div className="relative flex items-center gap-6 px-8">
                <MonitorPlayIcon className="w-16 h-16 text-accent drop-shadow-[0_0_18px_rgba(148,204,255,0.45)]" />
                <div className="text-left">
                  <p className="font-mono text-xs text-success flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse-soft" /> STREAMING · 1080p60 · 8 ms
                  </p>
                  <p className="font-display text-xl font-bold mt-1">cyberpunk-2077.exe</p>
                  <p className="text-xs text-muted mt-0.5">running via Proton on your cloud GPU</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Providers strip */}
      <section className="border-y border-white/5 bg-surface/30">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <p className="text-center text-xs uppercase tracking-widest text-muted mb-6">
            Bring the library you already own
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap opacity-80">
            {["steam", "epic", "gog", "ubisoft", "xbox", "battle", "riot"].map((id) => (
              <ProviderLogo key={id} id={id} className="w-8 h-8" />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="font-display text-3xl font-bold text-center tracking-tight">
          Everything a gaming platform should be
        </h2>
        <p className="text-center text-muted mt-3 max-w-xl mx-auto">
          Built like your own machine — because it is one.
        </p>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel p-6 hover:border-accent/30 transition-colors">
              <div className="w-11 h-11 rounded-xl clay-inset flex items-center justify-center mb-4">
                <f.icon className="w-[22px] h-[22px] text-accent" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="panel !rounded-3xl p-10">
          <h2 className="font-display text-3xl font-bold text-center tracking-tight">Up and running in minutes</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col items-start gap-3">
                <span className="font-mono text-accent text-sm">{s.n}</span>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={primaryHref}
              className="inline-block clay-btn bg-accent text-on-accent font-semibold px-8 py-3 rounded-xl hover:brightness-105 transition-all"
            >
              {authed ? "Open App" : "Create your account"}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span>© {new Date().getFullYear()} {APP_NAME} — private single-user deployment</span>
          <span className="font-mono">Linux · Proton · WebRTC</span>
        </div>
      </footer>
    </div>
  );
}
