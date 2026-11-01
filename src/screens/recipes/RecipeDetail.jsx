import { useState, useEffect } from 'preact/hooks';
import { useApp } from '../../context.jsx';
import {
  getRecipeWithIngredients, scaleIngredients, formatQuantity,
  splitSteps, parseStepPhotos, deleteRecipe,
} from '../../lib/recipes.js';
import { TypeBadge } from './RecipeList.jsx';

export function RecipeDetail({ id, tipiPasto, onBack, onEdit, onDeleted }) {
  const { source } = useApp();
  const [recipe, setRecipe] = useState(undefined); // undefined=loading, null=assente
  const [persone, setPersone] = useState(2);
  const [error, setError] = useState('');

  useEffect(() => {
    getRecipeWithIngredients(source, id)
      .then((r) => { setRecipe(r); if (r) setPersone(r.porzioni); })
      .catch((e) => { setError(e.message); setRecipe(null); });
  }, [id]);

  async function remove() {
    if (!confirm(`Eliminare "${recipe.titolo}"?`)) return;
    try { await deleteRecipe(source, id); await onDeleted(); } catch (e) { setError(e.message); }
  }

  if (recipe === undefined) return <p class="muted">Caricamento…</p>;
  if (!recipe) {
    return (<><button class="rc-btn" onClick={onBack}>← Ricette</button><p class="error">{error || 'Ricetta non trovata'}</p></>);
  }

  const ings = scaleIngredients(recipe.ingredienti, recipe.porzioni, persone);
  const steps = splitSteps(recipe.procedimento);
  const photos = parseStepPhotos(recipe.fotoStep);
  const isUrl = /^https?:\/\//i.test(recipe.fonte || '');

  return (
    <>
      <div class="rc-head">
        <button class="rc-btn" onClick={onBack}>← Ricette</button>
        <div class="rc-actions">
          <button class="rc-btn" onClick={onEdit}>Modifica</button>
          <button class="rc-btn rc-danger" onClick={remove}>Elimina</button>
        </div>
      </div>
      {recipe.foto && <img class="rc-cover" src={recipe.foto} alt="" />}
      <h1 class="rc-title">{recipe.titolo}</h1>
      <TypeBadge tipo={recipe.tipo} tipiPasto={tipiPasto} />
      {error && <p class="error">{error}</p>}

      <h2>Ingredienti</h2>
      <div class="rc-persons">
        <span>Persone</span>
        <button class="rc-btn" aria-label="Meno persone" onClick={() => setPersone(Math.max(1, persone - 1))}>−</button>
        <strong>{persone}</strong>
        <button class="rc-btn" aria-label="Più persone" onClick={() => setPersone(Math.min(50, persone + 1))}>+</button>
        {persone !== recipe.porzioni && (
          <button class="rc-btn-link" onClick={() => setPersone(recipe.porzioni)}>ricetta base: {recipe.porzioni}</button>
        )}
      </div>
      <ul class="rc-ings">
        {ings.map((i, k) => (
          <li key={k}>
            <span class="rc-qty">{formatQuantity(i.quantita, i.unita)}</span>
            <span>{i.nome}{i.nota && <em class="muted"> ({i.nota})</em>}</span>
          </li>
        ))}
        {!ings.length && <li class="muted">Nessun ingrediente.</li>}
      </ul>

      <h2>Procedimento</h2>
      <ol class="rc-steps">
        {steps.map((s, k) => (
          <li key={k}>
            <p>{s}</p>
            {photos[k] && <img class="rc-step-img" src={photos[k]} alt="" loading="lazy" />}
          </li>
        ))}
        {!steps.length && <li class="muted">Nessun procedimento.</li>}
      </ol>

      {recipe.fonte && (
        <p class="muted rc-source">
          Fonte: {isUrl ? <a href={recipe.fonte} target="_blank" rel="noopener noreferrer">{recipe.fonte}</a> : recipe.fonte}
        </p>
      )}
    </>
  );
}
