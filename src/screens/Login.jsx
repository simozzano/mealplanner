import { useState } from 'preact/hooks';

export function Login({ onLogin }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onLogin(token.trim());
    } catch (err) {
      setError(err.message || 'Accesso non riuscito');
      setBusy(false);
    }
  }

  return (
    <div class="login">
      <form class="login-card" onSubmit={submit}>
        <div class="login-logo">🍽️</div>
        <h1>Meal Planner</h1>
        <input
          type="password"
          placeholder="Token / password"
          autocomplete="current-password"
          value={token}
          onInput={(e) => setToken(e.currentTarget.value)}
          autofocus
        />
        {error && <p class="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Accesso…' : 'Entra'}</button>
      </form>
    </div>
  );
}
