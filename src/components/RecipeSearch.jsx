import { useState } from 'preact/hooks';

/**
 * Ricerca ricette per nome oppure per ingredienti (es. avanzi in frigo).
 * value = { mode: 'nome' | 'ingredienti', q: string, terms: string[] }
 */
export function RecipeSearch({ value, onChange, suggestions = [], className = '' }) {
  const [draft, setDraft] = useState('');
  const set = (patch) => onChange({ ...value, ...patch });

  const addTerm = (raw) => {
    const t = raw.trim().replace(/,$/, '').trim();
    if (t && !value.terms.some((x) => x.toLowerCase() === t.toLowerCase())) set({ terms: [...value.terms, t] });
    setDraft('');
  };

  return (
    <div class={`rs ${className}`}>
      <div class="rs-modes">
        <button class={value.mode === 'nome' ? 'on' : ''} onClick={() => set({ mode: 'nome' })}>Per nome</button>
        <button class={value.mode === 'ingredienti' ? 'on' : ''} onClick={() => set({ mode: 'ingredienti' })}>Per ingredienti</button>
      </div>
      {value.mode === 'nome' ? (
        <input
          class="rs-input"
          type="search"
          placeholder="Cerca ricetta…"
          value={value.q}
          onInput={(e) => set({ q: e.currentTarget.value })}
        />
      ) : (
        <>
          <input
            class="rs-input"
            list="rs-ingredients"
            placeholder="Ingredienti che hai (Invio per aggiungere)"
            value={draft}
            onInput={(e) => {
              const v = e.currentTarget.value;
              if (v.endsWith(',')) addTerm(v); else setDraft(v);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTerm(draft); } }}
            onBlur={() => draft.trim() && addTerm(draft)}
          />
          <datalist id="rs-ingredients">
            {suggestions.map((s) => <option value={s} key={s} />)}
          </datalist>
          {value.terms.length > 0 && (
            <div class="rs-tags">
              {value.terms.map((t) => (
                <button key={t} class="rs-tag" onClick={() => set({ terms: value.terms.filter((x) => x !== t) })}>
                  {t} ✕
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const EMPTY_SEARCH = { mode: 'nome', q: '', terms: [] };

/** Testo "n/m ingredienti" se la ricerca è per ingredienti. */
export const matchLabel = (item, search) =>
  search.mode === 'ingredienti' && search.terms.length ? `${item.matched}/${item.total} ingredienti` : '';
