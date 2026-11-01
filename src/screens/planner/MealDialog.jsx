import { useState, useMemo } from 'preact/hooks';
import { DEFAULT_PERSONS } from '../../lib/planner.js';

export function MealDialog({ title, recipes, entry, busy, onSave, onDelete, onClose }) {
  const [query, setQuery] = useState('');
  const [recipeId, setRecipeId] = useState(entry ? String(entry.ricettaId) : '');
  const [persone, setPersone] = useState(entry ? Number(entry.persone) || DEFAULT_PERSONS : DEFAULT_PERSONS);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? recipes.filter((r) => String(r.titolo).toLowerCase().includes(q)) : recipes;
  }, [recipes, query]);

  return (
    <div class="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="pl-dialog" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <input type="search" placeholder="Cerca ricetta…" value={query} onInput={(e) => setQuery(e.target.value)} />
        <ul class="pl-recipes">
          {filtered.map((r) => (
            <li key={r.id}>
              <button class={`pl-recipe${String(r.id) === recipeId ? ' sel' : ''}`} onClick={() => setRecipeId(String(r.id))}>
                {r.foto ? <img class="pl-thumb" src={r.foto} alt="" /> : <span class="pl-thumb pl-thumb-empty">🍽️</span>}
                <span>{r.titolo}</span>
              </button>
            </li>
          ))}
          {!filtered.length && <li class="muted">Nessuna ricetta trovata</li>}
        </ul>
        <div class="pl-stepper">
          <span>Persone</span>
          <button onClick={() => setPersone(Math.max(1, persone - 1))} aria-label="Meno persone">−</button>
          <strong>{persone}</strong>
          <button onClick={() => setPersone(persone + 1)} aria-label="Più persone">+</button>
        </div>
        <div class="pl-actions">
          {onDelete && <button class="danger" disabled={busy} onClick={onDelete}>Elimina</button>}
          <button onClick={onClose} disabled={busy}>Annulla</button>
          <button class="primary" disabled={busy || !recipeId} onClick={() => onSave({ ricettaId: recipeId, persone })}>
            {entry ? 'Salva' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  );
}
