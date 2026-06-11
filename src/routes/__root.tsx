import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SatsLearn — Learn anything. Pay in sats." },
      { name: "description", content: "Peer-to-peer education marketplace powered by Bitcoin Lightning." },
      { property: "og:title", content: "SatsLearn" },
      { property: "og:description", content: "Learn anything. Pay in sats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const tailwindConfig = `tailwind.config = {
    darkMode: "class",
    theme: { extend: {
      colors: {
        "secondary-fixed":"#cfeda5","on-primary":"#ffffff","surface-container-low":"#f0f5ed","inverse-on-surface":"#eef2ea","surface-variant":"#dfe4dc","secondary":"#4e662d","on-tertiary-fixed-variant":"#41493a","error-container":"#ffdad6","on-tertiary":"#ffffff","on-tertiary-container":"#f8ffed","on-primary-fixed":"#0f2000","error":"#ba1a1a","tertiary-fixed-dim":"#c1cab6","primary-fixed-dim":"#9dd75a","surface-dim":"#d7dbd3","surface":"#f6fbf2","tertiary-fixed":"#dde6d1","outline-variant":"#c2c9b4","inverse-primary":"#9dd75a","surface-container":"#ebefe7","on-background":"#181d18","surface-bright":"#f6fbf2","inverse-surface":"#2d322c","surface-container-highest":"#dfe4dc","on-tertiary-fixed":"#161e11","primary-container":"#4e8204","on-error":"#ffffff","background":"#f6fbf2","on-secondary-fixed-variant":"#374d17","surface-container-lowest":"#ffffff","tertiary":"#565f4f","on-primary-container":"#f9ffeb","on-secondary-container":"#536c32","on-surface-variant":"#424939","primary":"#3c6700","secondary-container":"#cfeda5","on-error-container":"#93000a","on-surface":"#181d18","secondary-fixed-dim":"#b4d08b","surface-tint":"#3e6a00","on-primary-fixed-variant":"#2d5000","on-secondary-fixed":"#112000","tertiary-container":"#6f7766","on-secondary":"#ffffff","outline":"#737a67","surface-container-high":"#e5eae1","primary-fixed":"#b7f473"
      },
      borderRadius: { "DEFAULT":"0.25rem","lg":"0.5rem","xl":"0.75rem","full":"9999px" },
      spacing: { "base_unit":"4px","margin_desktop":"40px","max_width":"1100px","margin_mobile":"16px","gutter":"24px" },
      fontFamily: {
        "body-lg":["Inter"],"body-md":["Inter"],"label-mono":["JetBrains Mono"],
        "display-lg-mobile":["Inter"],"sats-display":["JetBrains Mono"],
        "headline-md":["Inter"],"display-lg":["Inter"]
      },
      fontSize: {
        "body-lg":["18px",{"lineHeight":"1.6","fontWeight":"400"}],
        "body-md":["16px",{"lineHeight":"1.5","fontWeight":"400"}],
        "label-mono":["14px",{"lineHeight":"1.4","letterSpacing":"0.02em","fontWeight":"500"}],
        "display-lg-mobile":["32px",{"lineHeight":"1.2","letterSpacing":"-0.01em","fontWeight":"700"}],
        "sats-display":["20px",{"lineHeight":"1","fontWeight":"600"}],
        "headline-md":["24px",{"lineHeight":"1.3","fontWeight":"600"}],
        "display-lg":["48px",{"lineHeight":"1.1","letterSpacing":"-0.02em","fontWeight":"700"}]
      }
    } }
  };`;
  const customCss = `
    body { background-color: #030712; color: #f3f4f6; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
    .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; display: inline-block; }
    .border-brand { border-color: #1f2937; }
    .bg-brand-soft { background-color: #111827; }
    .text-brand-dark { color: #fbbf24; }
    .text-brand-hint { color: #9ca3af; }
    .text-brand-sub { color: #d1d5db; }
    .structural-card { background:#111827; border:1px solid #1f2937; box-shadow:none; }
    .structural-border { border: 1px solid #1f2937; }
    .sats-amount { color:#fbbf24; font-family:'JetBrains Mono', monospace; font-size:36px; font-weight:600; }
    .sidebar-active { background-color:#111827; border-left:2px solid #fbbf24; }
    .video-container { aspect-ratio: 16 / 9; background:#000000; position:relative; overflow:hidden; }
    .paywall-overlay { background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background:#4b5563; border-radius:10px; }
    .toggle-checkbox:checked { right:0; border-color:#fbbf24; background-color:#fbbf24; }
    .toggle-checkbox:checked + .toggle-label { background-color:#fbbf24; }
    .drag-zone-active { border-color:#fbbf24; background-color:#1e1b4b; }
    * { box-shadow: none !important; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #030712; }
    ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
  `;
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: tailwindConfig }} />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" />
        <style dangerouslySetInnerHTML={{ __html: customCss }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { AuthProvider, useAuth } from "../context/AuthContext";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayout() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-gray-950 text-gray-100 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl text-yellow-400 animate-pulse font-extrabold">⚡</span>
          <span className="text-sm text-gray-400">Loading SatsLearn...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 h-16">
        <div className="max-w-6xl mx-auto px-4 h-full flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold flex items-center gap-1.5 hover:opacity-90">
              <span className="text-yellow-400 font-extrabold">⚡</span>
              <span>SatsLearn</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/" className="text-gray-300 hover:text-yellow-400 transition-colors">
                Browse
              </Link>
              <Link to="/earn" className="text-gray-300 hover:text-yellow-400 transition-colors">
                Earn Sats
              </Link>
              <Link to="/dashboard" className="text-gray-300 hover:text-yellow-400 transition-colors">
                Dashboard
              </Link>
              <Link to="/wallet" className="text-gray-300 hover:text-yellow-400 transition-colors">
                Wallet
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 text-sm font-semibold text-yellow-400">
                  <span>⚡</span>
                  <span>{(user.balanceSats ?? 0).toLocaleString()} sats</span>
                </div>
                <span className="text-xs text-gray-400 hidden sm:inline">@{user.username} ({user.role})</span>
                <button
                  onClick={logout}
                  className="bg-gray-850 hover:bg-gray-800 text-gray-350 px-3 py-1.5 rounded text-xs border border-gray-700 transition-all cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="bg-gray-850 hover:bg-gray-800 text-gray-200 border border-gray-700 px-3 py-1.5 rounded text-sm transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold px-3 py-1.5 rounded text-sm transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Screen Switcher */}
      <ScreenSwitcher />
    </div>
  );
}

function ScreenSwitcher() {
  const screens: Array<{ to: string; label: string }> = [
    { to: "/", label: "Browse" },
    { to: "/earn", label: "Earn" },
    { to: "/wallet", label: "Wallet" },
    { to: "/dashboard", label: "Dashboard" },
  ];
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900/95 p-2 backdrop-blur">
      <span className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        Screens
      </span>
      {screens.map((s) => (
        <Link
          key={s.to}
          to={s.to}
          className="rounded-lg px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
          activeProps={{ className: "rounded-lg px-3 py-1 text-xs font-semibold bg-yellow-400 text-gray-950" }}
          activeOptions={{ exact: true }}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}

