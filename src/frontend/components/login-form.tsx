"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/frontend/lib/client";
import { Icon } from "./icon";
export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      router.replace("/overview");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="login-form">
      <h2>Welcome back</h2>
      <p className="muted">Sign in to your account to continue</p>
      <form onSubmit={submit}>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            placeholder="you@company.com"
          />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              maxLength={256}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name="eye" />
            </button>
          </span>
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button disabled={pending} type="submit">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="small muted">
        Don’t have an account? Contact your administrator.
      </p>
    </div>
  );
}
