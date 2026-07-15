import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { login } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      if (onLogin) onLogin();
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "24px auto", padding: 16, background: "white" }}>
      <h2>Login</h2>
      {error && <div style={{ color: "#b00020" }}>{error}</div>}
      <form onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
