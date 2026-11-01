import { useApp } from '../context.jsx';

export function Planner() {
  const { settings } = useApp();
  return (
    <section>
      <h1>Planner</h1>
      <p class="muted">Sezione in arrivo. Tipi pasto caricati: {settings.tipiPasto.length}.</p>
    </section>
  );
}
