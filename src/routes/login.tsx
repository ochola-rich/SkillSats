import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "SkillSats — Login" },
      { name: "description", content: "Sign in to your SkillSats account" },
    ],
  }),
  component: LoginComponent,
});

function LoginComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await apiClient.post("/api/auth/login", { email, password });
      const { token } = response.data;
      await login(token);
      navigate({ to: "/" });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-yellow-400">Login to SkillSats</h2>

      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-200 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-yellow-400 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-yellow-400 text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold py-2 px-4 rounded transition-all disabled:opacity-50 text-sm cursor-pointer"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
export default LoginComponent;
