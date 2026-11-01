import { useApp } from '../context.jsx';
import { useRoute, ROUTES } from '../router.js';
import { Planner } from '../screens/Planner.jsx';
import { Shopping } from '../screens/Shopping.jsx';
import { Recipes } from '../screens/Recipes.jsx';

const svg = (children) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS = {
  '/planner': svg(<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  '/spesa': svg(<><path d="M3 4h2.5l2 11h10l2-8H7" /><circle cx="9" cy="19.5" r="1" /><circle cx="17" cy="19.5" r="1" /></>),
  '/ricette': svg(<><path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2zM12 6.5v13" /></>),
};

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
                <span class="nav-icon">{ICONS[r.path]}</span>
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
