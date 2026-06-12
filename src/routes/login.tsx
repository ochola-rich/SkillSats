import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";

import { useAuth } from "../hooks/use-auth";
import { getErrorMessage, hasErrorCode } from "../lib/errors";
import { loginUser } from "../server/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Login - SkillSats" }] }),
});

function LoginPage() {
  const login = useServerFn(loginUser);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ data: { email, password } });
      await refreshUser();
      await navigate({ to: "/" });
    } catch (caught) {
      setError(
        hasErrorCode(caught, "INVALID_CREDENTIALS")
          ? "Invalid email or password."
          : getErrorMessage(caught, "Login failed."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto my-12 max-w-md rounded-xl border border-white/10 bg-[#111118] p-6">
      <h1 className="text-center text-2xl font-bold">Login to SkillSats</h1>
      {error && <p className="mt-4 rounded bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm text-gray-300">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-[#0a0a0f] px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm text-gray-300">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-[#0a0a0f] px-3 py-2"
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Login"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-400">
        New here?{" "}
        <Link to="/register" className="text-yellow-400 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
