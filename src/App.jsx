import { useState, useEffect } from 'preact/hooks';
import { AppContext } from './context.jsx';
import { createSource } from './api/index.js';
import { MOCK_TOKEN, SESSION_KEY } from './config.js';
import { resetMock } from './api/mockSource.js';
import { Layout } from './components/Layout.jsx';
import { Login } from './screens/Login.jsx';

export function App() {
  // session: null | { token, source, settings }
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(() => !!localStorage.getItem(SESSION_KEY));

  async function login(token) {
    const source = createSource(token);
    const settings = await source.loadSettings(); // lancia se token errato / server KO
    localStorage.setItem(SESSION_KEY, token);
    setSession({ token, source, settings });
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  // Ripristino sessione salvata
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;
    login(saved)
      .catch(() => localStorage.removeItem(SESSION_KEY))
      .finally(() => setBooting(false));
  }, []);

  if (booting) return <div class="splash">Caricamento…</div>;
  if (!session) return <Login onLogin={login} />;

  const ctx = {
    source: session.source,
    settings: session.settings,
    isMock: session.token === MOCK_TOKEN,
    logout,
    resetMock: () => { resetMock(); window.location.reload(); },
  };

  return (
    <AppContext.Provider value={ctx}>
      <Layout />
    </AppContext.Provider>
  );
}
