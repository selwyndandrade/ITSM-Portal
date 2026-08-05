import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { login, loading, authError } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      if (onLogin) onLogin();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.errors?.[0] || err?.message || "Login failed";
      setError(message);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-background-image" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__brand">
            <div className="auth-card__brand-mark">K</div>
            <div>
              <span className="auth-card__eyebrow">KYRO</span>
              <h2>Sign in to Kyro</h2>
              <p>Access requests, knowledge, and support tools from one secure workspace.</p>
            </div>
          </div>
        </div>

        <div className="auth-card__body">
          {(error || authError) && <div className="auth-card__error">{error || authError}</div>}

          <form className="auth-card__form" onSubmit={submit}>
            <div className="auth-card__field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
              />
            </div>

            <div className="auth-card__field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <div className="auth-card__row">
              <label>
                <input type="checkbox" />
                Remember me
              </label>
              <a href="#">Forgot password?</a>
            </div>

            <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>

          <div className="auth-card__support">
            Secure access for the Kyro workspace. Use your company credentials to continue.
          </div>

          <div className="auth-card__switch">
            Don&apos;t have an account?{' '}
            <button onClick={onSwitchToRegister}>Create one</button>
          </div>
        </div>
      </div>
    </div>
  );
}
