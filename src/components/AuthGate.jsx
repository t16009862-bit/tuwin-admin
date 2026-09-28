import { useEffect, useState } from 'react';
import { clearAdminAccessKey, setAdminAccessKey, verifyAdminAccess } from '../api/client';

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.sessionStorage.getItem('tuwin_admin_key')) {
      setStatus('locked');
      return;
    }

    verifyAdminAccess()
      .then(() => setStatus('ready'))
      .catch(() => {
        clearAdminAccessKey();
        setStatus('locked');
      });
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('checking');
    setAdminAccessKey(key.trim());
    try {
      await verifyAdminAccess();
      setStatus('ready');
    } catch {
      clearAdminAccessKey();
      setError('That access code is not valid.');
      setStatus('locked');
    }
  };

  if (status === 'ready') return children;

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="auth-kicker">Owner access only</p>
        <h1>Tuwin Website Control Panel</h1>
        <p>Enter the private admin access code. Visitors to the public website cannot add, edit, or delete data.</p>
        {status === 'checking' ? (
          <div className="loading-state">Checking access…</div>
        ) : (
          <form onSubmit={signIn}>
            {error && <div className="banner-error">{error}</div>}
            <div className="form-field">
              <label htmlFor="admin-access-code">Admin access code</label>
              <input id="admin-access-code" type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="current-password" required autoFocus />
            </div>
            <button className="btn btn-primary auth-submit" type="submit">Open control panel</button>
          </form>
        )}
      </section>
    </main>
  );
}
