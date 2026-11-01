import { useState } from 'preact/hooks';

export function TypeBadge({ tipo, tipiPasto }) {
  if (!tipo) return null;
  const t = (tipiPasto || []).find((x) => x.nome === tipo);
  return <span class="rc-badge" style={{ background: t?.colore || '#e5e7eb' }}>{tipo}</span>;
}

export function RecipeList({ recipes, tipiPasto, onOpen, onNew }) {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');

  const filtered = (recipes || []).filter(
    (r) =>
      (!tipo || r.tipo === tipo) &&
      (!q.trim() || String(r.titolo).toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <>
      <div class="rc-head">
        <h1>Ricette</h1>
        <button class="rc-btn rc-primary" onClick={onNew}>+ Nuova</button>
      </div>
      <input
        class="rc-input"
        type="search"
        placeholder="Cerca ricetta…"
        value={q}
        onInput={(e) => setQ(e.currentTarget.value)}
      />
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
        {filtered.map((r) => (
          <li key={r.id}>
            <button class="rc-card" onClick={() => onOpen(r.id)}>
              <div class="rc-thumb">
                {r.foto ? <img src={r.foto} alt="" loading="lazy" /> : <span>🍽️</span>}
              </div>
              <div class="rc-card-body">
                <strong>{r.titolo}</strong>
                <TypeBadge tipo={r.tipo} tipiPasto={tipiPasto} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
