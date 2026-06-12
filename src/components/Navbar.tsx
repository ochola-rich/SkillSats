import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "../hooks/use-auth";
import { logoutUser } from "../server/auth";

const navLinkClass = "text-sm font-medium text-gray-300 transition-colors hover:text-yellow-400";

export function Navbar() {
  const navigate = useNavigate();
  const logout = useServerFn(logoutUser);
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    await navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#111118]">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-[#F7B500]">
            SkillSats
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className={navLinkClass}>
              Home
            </Link>
            <Link to="/earn" className={navLinkClass}>
              Earn
            </Link>
            {user?.role === "CREATOR" && (
              <Link to="/dashboard" className={navLinkClass}>
                Dashboard
              </Link>
            )}
            {user && (
              <Link to="/wallet" className={navLinkClass}>
                Wallet
              </Link>
            )}
          </nav>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold text-gray-100">{user.username}</p>
              <p className="truncate text-xs text-gray-400">{user.email}</p>
            </div>
            <Link
              to="/wallet"
              className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 font-mono text-sm font-semibold text-yellow-400"
              title={`SkillSats balance for ${user.email}`}
            >
              {user.balanceSats.toLocaleString()} sats
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-1.5 text-sm text-gray-200">
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-[#F7B500] px-3 py-1.5 text-sm font-bold text-black"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
