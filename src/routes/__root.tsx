import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Navbar } from "../components/Navbar";
import { AuthProvider } from "../context/auth";
import { useAuth } from "../hooks/use-auth";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 text-center">
      <div>
        <p className="font-mono text-sm text-yellow-400">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <Link to="/" className="mt-6 inline-block text-yellow-400 hover:underline">
          Return home
        </Link>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">This page did not load</h1>
        <p className="mt-2 text-sm text-gray-400">Please retry or return to the course browser.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
            className="rounded-md bg-yellow-400 px-4 py-2 font-bold text-black"
          >
            Try again
          </button>
          <Link to="/" className="rounded-md border border-white/15 px-4 py-2">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SkillSats - Learn anything. Pay in sats." },
      {
        name: "description",
        content: "A peer-to-peer education marketplace powered by Bitcoin Lightning.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

function AppLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-gray-400">
        Loading SkillSats...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
