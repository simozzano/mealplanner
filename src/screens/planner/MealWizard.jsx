import { useState, useEffect, useMemo } from 'preact/hooks';
import { RecipeSearch, EMPTY_SEARCH, matchLabel } from '../../components/RecipeSearch.jsx';
import {
  getIngredientIndex, filterRecipes, getRecipeWithIngredients, scaleIngredients, formatQuantity, splitSteps,
} from '../../lib/recipes.js';
import { MEALS, DEFAULT_PERSONS, toISO } from '../../lib/planner.js';

/**
 * Flusso: cerca ricetta → visualizza → (scegli giorno/momento se non già noti) → conferma.
 * `preset` = { iso?, pasto? } con i valori già scelti.
 */
export function MealWizard({ source, settings, recipes, preset, busy, onConfirm, onClose }) {
  const [step, setStep] = useState('recipe'); // recipe | detail | when
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [index, setIndex] = useState({});
  const [recipe, setRecipe] = useState(null);
  const [persone, setPersone] = useState(DEFAULT_PERSONS);
  const [iso, setIso] = useState(preset.iso || toISO(new Date()));
  const [pasto, setPasto] = useState(preset.pasto || 'pranzo');
  const known = Boolean(preset.iso && preset.pasto);

  useEffect(() => { getIngredientIndex(source).then(setIndex).catch(() => {}); }, [source]);

  const items = useMemo(
    () => filterRecipes(recipes, index, search.mode === 'nome' ? { q: search.q } : { terms: search.terms }),
    [recipes, index, search],
  );

  const open = async (id) => {
    setRecipe(await getRecipeWithIngredients(source, id));
    setStep('detail');
  };
  const confirm = () => onConfirm({ iso, pasto, ricettaId: recipe.id, persone });
  const scaled = recipe ? scaleIngredients(recipe.ingredienti, Number(recipe.porzioni) || 1, persone) : [];
  const tipo = recipe && settings.tipiPasto.find((t) => t.nome === recipe.tipo);

  return (
    <div class="pl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="pl-dialog" role="dialog" aria-modal="true">
        {step === 'recipe' && (
          <>
            <h2>Scegli la ricetta</h2>
            <RecipeSearch value={search} onChange={setSearch} suggestions={settings.ingredienti.map((i) => i.nome)} />
            <ul class="pl-recipes">
              {items.map((it) => {
                const r = it.recipe;
                const ml = matchLabel(it, search);
                return (
                  <li key={r.id}>
                    <button class="pl-recipe" onClick={() => open(r.id)}>
                      {r.foto ? <img class="pl-thumb" src={r.foto} alt="" /> : <span class="pl-thumb pl-thumb-empty">🍽️</span>}
                      <span class="pl-entry-text">
                        <span>{r.titolo}</span>
                        {ml && <span class="pl-entry-sub">{ml}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!items.length && <li class="muted">Nessuna ricetta trovata</li>}
            </ul>
            <div class="pl-actions"><button onClick={onClose}>Annulla</button></div>
          </>
        )}

        {step === 'detail' && recipe && (
          <>
            <h2>{recipe.titolo}</h2>
            {recipe.foto && <img class="pl-hero" src={recipe.foto} alt="" />}
            <div class="pl-meta">
              {tipo && <span class="rc-badge" style={{ background: tipo.colore }}>{tipo.nome}</span>}
              {recipe.fonte && <small class="muted">{recipe.fonte}</small>}
            </div>
            <div class="pl-stepper">
              <span>Persone</span>
              <button onClick={() => setPersone(Math.max(1, persone - 1))} aria-label="Meno persone">−</button>
              <strong>{persone}</strong>
              <button onClick={() => setPersone(persone + 1)} aria-label="Più persone">+</button>
            </div>
            <ul class="pl-ing">
              {scaled.map((i, n) => (
                <li key={n}>{formatQuantity(i.quantita, i.unita)} {i.nome}{i.nota ? ` (${i.nota})` : ''}</li>
              ))}
            </ul>
            <ol class="pl-steps">
              {splitSteps(recipe.procedimento).map((s, n) => <li key={n}>{s}</li>)}
            </ol>
            <div class="pl-actions">
              <button onClick={() => setStep('recipe')} disabled={busy}>Indietro</button>
              {known ? (
                <button class="primary" disabled={busy} onClick={confirm}>Aggiungi al planner</button>
              ) : (
                <button class="primary" onClick={() => setStep('when')}>Scegli giorno</button>
              )}
            </div>
          </>
        )}

        {step === 'when' && recipe && (
          <>
            <h2>Quando?</h2>
            <label class="pl-field">Giorno
              <input type="date" value={iso} onInput={(e) => setIso(e.currentTarget.value)} />
            </label>
            <div class="pl-chips">
              {MEALS.map((m) => (
                <button key={m.key} class={pasto === m.key ? 'on' : ''} onClick={() => setPasto(m.key)}>{m.label}</button>
              ))}
            </div>
            <div class="pl-actions">
              <button onClick={() => setStep('detail')} disabled={busy}>Indietro</button>
              <button class="primary" disabled={busy || !iso} onClick={confirm}>Aggiungi al planner</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
