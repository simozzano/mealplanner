import { useApp } from '../context.jsx';
import { useRoute, ROUTES } from '../router.js';
import { Planner } from '../screens/Planner.jsx';
import { Shopping } from '../screens/Shopping.jsx';
import { Recipes } from '../screens/Recipes.jsx';

const SCREENS = { '/planner': Planner, '/spesa': Shopping, '/ricette': Recipes };

export function Layout() {
  const { logout, isMock, resetMock } = useApp();
  const path = useRoute();
  const Screen = SCREENS[path];

  return (
    <div class="layout">
      <nav class="nav" aria-label="Navigazione principale">
        <div class="nav-brand">🍽️ Meal Planner</div>
        <ul class="nav-list">
          {ROUTES.map((r) => (
            <li key={r.path}>
              <a href={`#${r.path}`} class={`nav-item${r.path === path ? ' active' : ''}`}>
                <span class="nav-icon">{r.icon}</span>
                <span class="nav-label">
                  <span class="full">{r.label}</span>
                  <span class="short">{r.short || r.label}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div class="nav-footer">
          {isMock && (
            <button class="btn-link" onClick={() => confirm('Ripristinare i dati mock originali?') && resetMock()}>
              Reset mock
            </button>
          )}
          <button class="btn-link" onClick={logout}>Esci</button>
        </div>
      </nav>
      <main class="content">
        <Screen />
      </main>
    </div>
  );
}
