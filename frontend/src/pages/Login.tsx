import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, setToken } from "../lib/api";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/patients";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.login(username.trim(), password);
      setToken(response.access_token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-n-25 px-6">
      <div className="w-full max-w-sm rounded-md border border-n-100 bg-n-0 p-6">
        <h1 className="text-xl font-semibold text-n-950">PulseGuard</h1>
        <p className="mt-1 text-sm text-n-600">
          Synthetic-data clinical decision-support prototype.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-n-800">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-3 py-2 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-n-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-3 py-2 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>
          {error ? <p className="text-sm text-critical">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent-strong px-3 py-2 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-info focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-n-400">
          Hackathon demo account: <span className="font-mono">demo</span> /{" "}
          <span className="font-mono">demo-password</span>
        </p>
      </div>
    </div>
  );
}
