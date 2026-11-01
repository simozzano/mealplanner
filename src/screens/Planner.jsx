import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useApp } from '../context.jsx';
import { getRecipeList } from '../lib/recipes.js';
import {
  MEALS, VIEWS, periodDays, shiftPeriod, parseISO, toISO, groupBySlot, datesWithMeals, datesSkipped, setSkipped,
  addMeal, updateMeal, removeMeal,
} from '../lib/planner.js';
import { MealDialog } from './planner/MealDialog.jsx';
import { MealWizard } from './planner/MealWizard.jsx';
import '../styles/planner.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const fmtDay = (iso) => parseISO(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const fmtLong = (iso) => parseISO(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

export function Planner() {
  const { source, settings } = useApp();
  const [view, setView] = useState('settimana');
  const [anchor, setAnchor] = useState(() => new Date());
  const [rows, setRows] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // null | {type:'day', iso} | {type:'wizard', preset} | {type:'edit', entry, iso}
  const [ui, setUi] = useState(null);

  const { days, first, last } = useMemo(() => periodDays(anchor, view), [anchor, view]);
  const today = toISO(new Date());
  const withMeals = useMemo(() => datesWithMeals(rows), [rows]);
  const skipped = useMemo(() => datesSkipped(rows), [rows]);
  const slots = useMemo(() => groupBySlot(rows), [rows]);
  const recipeById = useMemo(() => Object.fromEntries(recipes.map((r) => [String(r.id), r])), [recipes]);

  const reload = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([source.list('planner'), getRecipeList(source)]);
      setRows(p);
      setRecipes(r);
    } catch (e) {
      setError(e.message);
    }
  }, [source]);

  useEffect(() => { reload(); }, [reload]);

  async function run(fn, next = null) {
    setBusy(true);
    setError('');
    try {
      await fn();
      setUi(next);
      await reload();
    } catch (e) {
      setError(e.message || 'Errore');
    } finally {
      setBusy(false);
    }
  }

  const onWizardConfirm = ({ iso, pasto, ricettaId, persone }) =>
    run(() => addMeal(source, settings, { data: iso, pasto, ricettaId, persone }));
  const onEditSave = ({ ricettaId, persone }) =>
    run(() => updateMeal(source, settings, ui.entry.id, { ricettaId, persone }), { type: 'day', iso: ui.iso });
  const onSkip = (iso, value) => run(() => setSkipped(source, rows, iso, value), { type: 'day', iso });
  const onEditDelete = () => run(() => removeMeal(source, ui.entry.id), { type: 'day', iso: ui.iso });

  const label = view === 'mese'
    ? anchor.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    : `${fmtDay(first)} – ${fmtDay(last)}`;

  const dayEntries = (iso) => MEALS.flatMap((m) => (slots[`${iso}|${m.key}`] || []).map((e) => ({ e, m })));

  return (
    <section class="planner">
      <div class="pl-head">
        <h1>Planner</h1>
        <button class="pl-primary" onClick={() => setUi({ type: 'wizard', preset: {} })}>+ Aggiungi</button>
      </div>
      <div class="pl-views" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.key} class={view === v.key ? 'on' : ''} onClick={() => { setView(v.key); setAnchor(new Date()); }}>
            {v.label}
          </button>
        ))}
      </div>
      <div class="pl-nav">
        <button onClick={() => setAnchor(shiftPeriod(anchor, view, -1))} aria-label="Periodo precedente">‹</button>
        <button onClick={() => setAnchor(new Date())}>Oggi</button>
        <button onClick={() => setAnchor(shiftPeriod(anchor, view, 1))} aria-label="Periodo successivo">›</button>
        <span class="pl-range">{label}</span>
      </div>
      {error && <p class="error">{error}</p>}

      <div class="pl-grid">
        {WEEKDAYS.map((d) => <div class="pl-wd" key={d}>{d}</div>)}
        {days.map((iso, i) => iso ? (
          <button
            key={iso}
            class={`pl-sq${iso === today ? ' is-today' : ''}`}
            onClick={() => setUi({ type: 'day', iso })}
            aria-label={`${fmtLong(iso)}: ${skipped.has(iso) ? 'giornata saltata' : withMeals.has(iso) ? 'pasti pianificati' : 'nessun pasto'}`}
          >
            <span class="pl-num">{parseISO(iso).getDate()}</span>
            {view !== 'mese' && <span class="pl-mon">{parseISO(iso).toLocaleDateString('it-IT', { month: 'short' })}</span>}
            <span class={`pl-bar ${skipped.has(iso) ? 'skip' : withMeals.has(iso) ? 'ok' : 'empty'}`} />
          </button>
        ) : <div key={`pad${i}`} />)}
      </div>

      {ui?.type === 'day' && (
        <div class="pl-overlay" onClick={(e) => e.target === e.currentTarget && setUi(null)}>
          <div class="pl-dialog" role="dialog" aria-modal="true">
            <h2>{fmtLong(ui.iso)}</h2>
            <label class="pl-skip">
              <input type="checkbox" checked={skipped.has(ui.iso)} disabled={busy}
                onChange={(e) => onSkip(ui.iso, e.currentTarget.checked)} />
              Salta la giornata
            </label>
            {dayEntries(ui.iso).length === 0 && <p class="muted">Nessun pasto pianificato.</p>}
            <ul class="pl-recipes">
              {dayEntries(ui.iso).map(({ e, m }) => {
                const rec = recipeById[String(e.ricettaId)];
                return (
                  <li key={e.id}>
                    <button class="pl-recipe" onClick={() => setUi({ type: 'edit', entry: e, iso: ui.iso })}>
                      {rec?.foto ? <img class="pl-thumb" src={rec.foto} alt="" /> : <span class="pl-thumb pl-thumb-empty">🍽️</span>}
                      <span class="pl-entry-text">
                        <span class="pl-entry-title">{rec ? rec.titolo : 'Ricetta eliminata'}</span>
                        <span class="pl-entry-sub">{m.label} · 👥 {e.persone}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div class="pl-sub">Aggiungi pasto</div>
            <div class="pl-chips">
              {MEALS.map((m) => (
                <button key={m.key} onClick={() => setUi({ type: 'wizard', preset: { iso: ui.iso, pasto: m.key } })}>
                  {m.label}
                </button>
              ))}
            </div>
            <div class="pl-actions"><button onClick={() => setUi(null)}>Chiudi</button></div>
          </div>
        </div>
      )}

      {ui?.type === 'wizard' && (
        <MealWizard
          source={source}
          settings={settings}
          recipes={recipes}
          preset={ui.preset}
          busy={busy}
          onConfirm={onWizardConfirm}
          onClose={() => setUi(ui.preset.iso ? { type: 'day', iso: ui.preset.iso } : null)}
        />
      )}

      {ui?.type === 'edit' && (
        <MealDialog
          title={`${MEALS.find((m) => m.key === ui.entry.pasto)?.label} · ${fmtDay(ui.iso)}`}
          recipes={recipes}
          entry={ui.entry}
          busy={busy}
          onSave={onEditSave}
          onDelete={onEditDelete}
          onClose={() => setUi({ type: 'day', iso: ui.iso })}
        />
      )}
    </section>
  );
}
