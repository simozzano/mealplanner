import { useState, useEffect } from 'preact/hooks';

export const ROUTES = [
  { path: '/planner', label: 'Planner', icon: '📅' },
  { path: '/spesa', label: 'Lista della Spesa', short: 'Spesa', icon: '🛒' },
  { path: '/ricette', label: 'Ricette', icon: '🍳' },
];
export const DEFAULT_ROUTE = '/planner';

const current = () => {
  const p = window.location.hash.replace(/^#/, '') || DEFAULT_ROUTE;
  return ROUTES.some((r) => r.path === p) ? p : DEFAULT_ROUTE;
};

/** Router a hash minimale: restituisce il path corrente. */
export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => setPath(current());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}
