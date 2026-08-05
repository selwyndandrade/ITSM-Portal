import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthBackgroundVideo from './AuthBackgroundVideo';

export default function Register({ onRegister, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setErrors([]);
    setSuccess(false);

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await register(email, password);
      setSuccess(true);
      // Automatically switch to login after 2 seconds
      setTimeout(() => {
        if (onSwitchToLogin) onSwitchToLogin();
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);

      // Handle detailed error messages from backend
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setErrors(err.response.data.errors);
        setError(err.response.data.message || 'Registration failed');
      } else if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  }

  return (
    <div className="auth-shell">
      <AuthBackgroundVideo />
      <div className="auth-background-image" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__brand">
            <div className="auth-card__brand-mark">K</div>
            <div>
              <span className="auth-card__eyebrow">KYRO</span>
              <h2>Create your Kyro account</h2>
              <p>Join the Kyro workspace with your work email.</p>
            </div>
          </div>
        </div>

        <div className="auth-card__body">
          {error && <div className="auth-card__error">{error}</div>}
          {success && <div className="auth-card__success">Registration successful! Logging you in...</div>}

          <form className="auth-card__form" onSubmit={submit}>
            <div className="auth-card__field">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
              />
            </div>

            <div className="auth-card__field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
              <small style={{ color: '#64748b', fontSize: 12, display: 'block' }}>
                Use a strong password for your Kyro account.
              </small>
            </div>

            <div className="auth-card__field">
              <label htmlFor="register-confirm">Confirm password</label>
              <input
                id="register-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter your password"
              />
            </div>

            <button type="submit">Create account</button>
          </form>

          <div className="auth-card__support">
            Your account unlocks the Kyro workspace for requests, approvals, and knowledge access.
          </div>

          <div className="auth-card__switch">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
}
