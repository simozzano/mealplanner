import { useState, useEffect } from 'preact/hooks';
import { useApp } from '../../context.jsx';
import {
  UNITS, getRecipeWithIngredients, saveRecipe, parseRecipeText, splitSteps, parseStepPhotos,
} from '../../lib/recipes.js';
import { PhotoInput } from './PhotoInput.jsx';

const emptyIng = () => ({ nome: '', quantita: '', unita: 'gr', nota: '' });
const emptyForm = (tipo) => ({
  titolo: '', tipo: tipo || '', porzioni: 2, fonte: '', foto: '',
  ingredienti: [emptyIng()], steps: [{ testo: '', foto: '' }],
});

export function RecipeForm({ id, onCancel, onSaved }) {
  const { source, settings } = useApp();
  const [f, setF] = useState(() => emptyForm(settings.tipiPasto[0]?.nome));
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecipeWithIngredients(source, id)
      .then((r) => {
        if (!r) throw new Error('Ricetta non trovata');
        const photos = parseStepPhotos(r.fotoStep);
        const steps = splitSteps(r.procedimento).map((testo, k) => ({ testo, foto: photos[k] || '' }));
        setF({
          titolo: r.titolo, tipo: r.tipo, porzioni: r.porzioni, fonte: r.fonte || '', foto: r.foto || '',
          ingredienti: r.ingredienti.length ? r.ingredienti : [emptyIng()],
          steps: steps.length ? steps : [{ testo: '', foto: '' }],
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const setIng = (k, patch) => set({ ingredienti: f.ingredienti.map((x, i) => (i === k ? { ...x, ...patch } : x)) });
  const setStep = (k, patch) => set({ steps: f.steps.map((x, i) => (i === k ? { ...x, ...patch } : x)) });
  const move = (arr, k, d) => {
    const n = [...arr]; const j = k + d;
    if (j < 0 || j >= n.length) return arr;
    [n[k], n[j]] = [n[j], n[k]];
    return n;
  };

  function applyPaste() {
    const p = parseRecipeText(pasteText);
    set({
      titolo: p.titolo || f.titolo,
      porzioni: p.porzioni || f.porzioni,
      fonte: p.fonte || f.fonte,
      ingredienti: p.ingredienti.length ? p.ingredienti : f.ingredienti,
      steps: p.steps.length ? p.steps.map((testo) => ({ testo, foto: '' })) : f.steps,
    });
    setPasteOpen(false);
    setPasteText('');
  }

  async function submit(e) {
    e.preventDefault();
    if (!f.titolo.trim()) { setError('Il titolo è obbligatorio'); return; }
    setSaving(true); setError('');
    try {
      onSaved(await saveRecipe(source, id, f, f.ingredienti));
    } catch (x) {
      setError(x.message || 'Salvataggio non riuscito (spazio esaurito?)');
      setSaving(false);
    }
  }

  if (loading) return <p class="muted">Caricamento…</p>;

  return (
    <form class="rc-form" onSubmit={submit}>
      <div class="rc-head">
        <h1>{id ? 'Modifica ricetta' : 'Nuova ricetta'}</h1>
      </div>

      {!id && (
        <div class="rc-paste">
          <button type="button" class="rc-btn" onClick={() => setPasteOpen(!pasteOpen)}>📋 Incolla testo</button>
          {pasteOpen && (
            <>
              <textarea
                class="rc-input" rows="8" value={pasteText}
                placeholder={'Titolo\nIngredienti\n200 g farina\n2 uova\nProcedimento\n1. Mescola…'}
                onInput={(e) => setPasteText(e.currentTarget.value)}
              />
              <button type="button" class="rc-btn rc-primary" disabled={!pasteText.trim()} onClick={applyPaste}>
                Analizza e compila
              </button>
            </>
          )}
        </div>
      )}

      <label class="rc-field">Titolo
        <input class="rc-input" value={f.titolo} onInput={(e) => set({ titolo: e.currentTarget.value })} required />
      </label>
      <div class="rc-row">
        <label class="rc-field">Tipo
          <select class="rc-input" value={f.tipo} onChange={(e) => set({ tipo: e.currentTarget.value })}>
            <option value="">—</option>
            {settings.tipiPasto.map((t) => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
          </select>
        </label>
        <label class="rc-field">Porzioni base
          <input class="rc-input" type="number" min="1" max="50" value={f.porzioni}
            onInput={(e) => set({ porzioni: e.currentTarget.value })} />
        </label>
      </div>

      <div class="rc-field">Foto di copertina
        <PhotoInput value={f.foto} onChange={(foto) => set({ foto })} label="Aggiungi copertina" />
      </div>

      <h2>Ingredienti</h2>
      <datalist id="rc-ing-suggest">
        {settings.ingredienti.map((i) => <option key={i.nome} value={i.nome} />)}
      </datalist>
      {f.ingredienti.map((i, k) => (
        <div class="rc-ing-row" key={k}>
          <input class="rc-input rc-ing-name" list="rc-ing-suggest" placeholder="Ingrediente" value={i.nome}
            onInput={(e) => setIng(k, { nome: e.currentTarget.value })} />
          <input class="rc-input rc-ing-qty" type="number" step="any" min="0" inputMode="decimal" placeholder="Qtà"
            value={i.quantita} onInput={(e) => setIng(k, { quantita: e.currentTarget.value })} />
          <select class="rc-input rc-ing-unit" value={i.unita} onChange={(e) => setIng(k, { unita: e.currentTarget.value })}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <input class="rc-input rc-ing-note" placeholder="Nota" value={i.nota}
            onInput={(e) => setIng(k, { nota: e.currentTarget.value })} />
          <button type="button" class="rc-btn rc-danger" aria-label="Rimuovi ingrediente"
            onClick={() => set({ ingredienti: f.ingredienti.filter((_, j) => j !== k) })}>✕</button>
        </div>
      ))}
      <button type="button" class="rc-btn" onClick={() => set({ ingredienti: [...f.ingredienti, emptyIng()] })}>+ Ingrediente</button>

      <h2>Procedimento</h2>
      {f.steps.map((s, k) => (
        <div class="rc-step-row" key={k}>
          <div class="rc-step-head">
            <strong>Step {k + 1}</strong>
            <span>
              <button type="button" class="rc-btn" aria-label="Su" onClick={() => set({ steps: move(f.steps, k, -1) })}>↑</button>
              <button type="button" class="rc-btn" aria-label="Giù" onClick={() => set({ steps: move(f.steps, k, 1) })}>↓</button>
              <button type="button" class="rc-btn rc-danger" aria-label="Rimuovi step"
                onClick={() => set({ steps: f.steps.filter((_, j) => j !== k) })}>✕</button>
            </span>
          </div>
          <textarea class="rc-input" rows="3" value={s.testo} onInput={(e) => setStep(k, { testo: e.currentTarget.value })} />
          <PhotoInput small value={s.foto} onChange={(foto) => setStep(k, { foto })} label="Foto step" />
        </div>
      ))}
      <button type="button" class="rc-btn" onClick={() => set({ steps: [...f.steps, { testo: '', foto: '' }] })}>+ Step</button>

      <label class="rc-field">Fonte / URL
        <input class="rc-input" value={f.fonte} onInput={(e) => set({ fonte: e.currentTarget.value })} />
      </label>

      {error && <p class="error">{error}</p>}
      <div class="rc-actions rc-sticky">
        <button type="button" class="rc-btn" onClick={onCancel} disabled={saving}>Annulla</button>
        <button type="submit" class="rc-btn rc-primary" disabled={saving}>{saving ? 'Salvo…' : 'Salva'}</button>
      </div>
    </form>
  );
}
