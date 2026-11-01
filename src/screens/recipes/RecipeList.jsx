import { useState, useEffect } from 'preact/hooks';
import { useApp } from '../../context.jsx';
import { getIngredientIndex, filterRecipes } from '../../lib/recipes.js';
import { RecipeSearch, EMPTY_SEARCH, matchLabel } from '../../components/RecipeSearch.jsx';

export function TypeBadge({ tipo, tipiPasto }) {
  if (!tipo) return null;
  const t = (tipiPasto || []).find((x) => x.nome === tipo);
  return <span class="rc-badge" style={{ background: t?.colore || '#e5e7eb' }}>{tipo}</span>;
}

export function RecipeList({ recipes, tipiPasto, onOpen, onNew }) {
  const { source, settings } = useApp();
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [tipo, setTipo] = useState('');
  const [index, setIndex] = useState({});
  useEffect(() => { getIngredientIndex(source).then(setIndex).catch(() => {}); }, [source, recipes]);

  const filtered = filterRecipes(recipes, index, search.mode === 'nome' ? { q: search.q } : { terms: search.terms })
    .filter((x) => !tipo || x.recipe.tipo === tipo);

  return (
    <>
      <div class="rc-head">
        <h1>Ricette</h1>
        <button class="rc-btn rc-primary" onClick={onNew}>+ Nuova</button>
      </div>
      <RecipeSearch value={search} onChange={setSearch} suggestions={settings.ingredienti.map((i) => i.nome)} />
      <div class="rc-filters">
        <button class={`rc-chip ${!tipo ? 'on' : ''}`} onClick={() => setTipo('')}>Tutte</button>
        {(tipiPasto || []).map((t) => (
          <button
            key={t.nome}
            class={`rc-chip ${tipo === t.nome ? 'on' : ''}`}
            style={tipo === t.nome ? { background: t.colore, borderColor: t.colore } : { borderColor: t.colore }}
            onClick={() => setTipo(tipo === t.nome ? '' : t.nome)}
          >
            {t.nome}
          </button>
        ))}
      </div>
      {recipes === null && <p class="muted">Caricamento…</p>}
      {recipes && !filtered.length && <p class="muted">Nessuna ricetta trovata.</p>}
      <ul class="rc-list">
        {filtered.map((item) => {
          const r = item.recipe;
          const ml = matchLabel(item, search);
          return (
            <li key={r.id}>
              <button class="rc-card" onClick={() => onOpen(r.id)}>
                <div class="rc-thumb">
                  {r.foto ? <img src={r.foto} alt="" loading="lazy" /> : <span>🍽️</span>}
                </div>
                <div class="rc-card-body">
                  <strong>{r.titolo}</strong>
                  <TypeBadge tipo={r.tipo} tipiPasto={tipiPasto} />
                  {r.fonte && <small class="rc-card-src">{r.fonte}</small>}
                  {ml && <small class="rc-card-src">{ml}</small>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
