import { useApp } from '../context.jsx';

export function Shopping() {
  const { settings } = useApp();
  return (
    <section>
      <h1>Lista della Spesa</h1>
      <p class="muted">Sezione in arrivo. Ingredienti caricati: {settings.ingredienti.length}.</p>
    </section>
  );
}
