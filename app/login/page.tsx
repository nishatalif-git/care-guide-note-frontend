'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, auth } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [interests, setInterests] = useState('chess, reading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register({
              name,
              email,
              password,
              interests: interests
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean),
            });

      auth.save(result.token, result.user);
      router.push('/notes');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>

      {error && <p className="error">{error}</p>}

      <form onSubmit={submit} className="card">
        {mode === 'register' && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>

        {mode === 'register' && (
          <label>
            Interests (comma separated)
            <input value={interests} onChange={(e) => setInterests(e.target.value)} />
          </label>
        )}

        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Need an account?' : 'Have an account?'}
          </button>
        </div>
      </form>

      <p className="muted">
        Seeded accounts: <code>admin@example.com</code> / the password in the backend .env, and{' '}
        <code>user1@example.com</code> / <code>Password@123</code>.
      </p>
    </>
  );
}
