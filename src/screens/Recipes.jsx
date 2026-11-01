import { useApp } from '../context.jsx';

export function Recipes() {
  const { settings } = useApp();
  return (
    <section>
      <h1>Ricette</h1>
      <p class="muted">Sezione in arrivo. Categorie caricate: {settings.categorie.length}.</p>
    </section>
  );
}
