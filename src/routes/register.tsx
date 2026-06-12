import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";

import { useAuth } from "../hooks/use-auth";
import { getErrorMessage, hasErrorCode } from "../lib/errors";
import { registerUser } from "../server/auth";

type Role = "LEARNER" | "CREATOR" | "ADVERTISER";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Register - SkillSats" }] }),
});

function RegisterPage() {
  const register = useServerFn(registerUser);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("LEARNER");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({ data: { email, username, password, role } });
      await refreshUser();
      await navigate({ to: "/" });
    } catch (caught) {
      setError(
        hasErrorCode(caught, "EMAIL_OR_USERNAME_TAKEN")
          ? "That email or username is already in use."
          : getErrorMessage(caught, "Registration failed."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto my-12 max-w-md rounded-xl border border-white/10 bg-[#111118] p-6">
      <h1 className="text-center text-2xl font-bold">Create your account</h1>
      {error && <p className="mt-4 rounded bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm text-gray-300">
          Username
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-[#0a0a0f] px-3 py-2"
            required
          />
        </label>
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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-[#0a0a0f] px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm text-gray-300">
          Account type
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="mt-1 w-full rounded-md border border-white/10 bg-[#0a0a0f] px-3 py-2"
          >
            <option value="LEARNER">Learner</option>
            <option value="CREATOR">Creator</option>
            <option value="ADVERTISER">Advertiser</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-400">
        Already registered?{" "}
        <Link to="/login" className="text-yellow-400 hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
