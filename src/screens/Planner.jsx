import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useApp } from '../context.jsx';
import { getRecipeList } from '../lib/recipes.js';
import {
  MEALS, weekDays, shiftWeek, parseISO, toISO, groupBySlot, addMeal, updateMeal, removeMeal,
} from '../lib/planner.js';
import { MealDialog } from './planner/MealDialog.jsx';
import '../styles/planner.css';

const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const fmtDay = (iso) => parseISO(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

export function Planner() {
  const { source, settings } = useApp();
  const [anchor, setAnchor] = useState(() => new Date());
  const [rows, setRows] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // { data, pasto, entry? }

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const today = toISO(new Date());
  const slots = useMemo(() => groupBySlot(rows), [rows]);
  const recipeById = useMemo(() => Object.fromEntries(recipes.map((r) => [String(r.id), r])), [recipes]);

  const reload = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([source.list('planner'), Promise.resolve(getRecipeList(source))]);
      setRows(p);
      setRecipes(r);
    } catch (e) {
      setError(e.message);
    }
  }, [source]);

  useEffect(() => { reload(); }, [reload]);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      setDialog(null);
      await reload();
    } catch (e) {
      setError(e.message || 'Errore');
    } finally {
      setBusy(false);
    }
  }

  const onSave = ({ ricettaId, persone }) =>
    run(() =>
      dialog.entry
        ? updateMeal(source, settings, dialog.entry.id, { ricettaId, persone })
        : addMeal(source, settings, { data: dialog.data, pasto: dialog.pasto, ricettaId, persone }));
  const onDelete = () => run(() => removeMeal(source, dialog.entry.id));

  function renderSlot(iso, meal) {
    const entries = slots[`${iso}|${meal.key}`] || [];
    return (
      <div class="pl-slot" key={meal.key}>
        <div class="pl-slot-label">{meal.label}</div>
        {entries.map((e) => {
          const rec = recipeById[String(e.ricettaId)];
          return (
            <button class="pl-entry" key={e.id} onClick={() => setDialog({ data: iso, pasto: meal.key, entry: e })}>
              {rec?.foto ? <img class="pl-thumb" src={rec.foto} alt="" loading="lazy" /> : <span class="pl-thumb pl-thumb-empty">🍽️</span>}
              <span class="pl-entry-text">
                <span class="pl-entry-title">{rec ? rec.titolo : 'Ricetta eliminata'}</span>
                <span class="pl-entry-sub">👥 {e.persone}</span>
              </span>
            </button>
          );
        })}
        <button class="pl-add" onClick={() => setDialog({ data: iso, pasto: meal.key })} aria-label={`Aggiungi ${meal.label}`}>+</button>
      </div>
    );
  }

  return (
    <section class="planner">
      <h1>Planner</h1>
      <div class="pl-nav">
        <button onClick={() => setAnchor(shiftWeek(anchor, -1))} aria-label="Settimana precedente">‹</button>
        <button onClick={() => setAnchor(new Date())}>Oggi</button>
        <button onClick={() => setAnchor(shiftWeek(anchor, 1))} aria-label="Settimana successiva">›</button>
        <span class="pl-range">{fmtDay(days[0])} – {fmtDay(days[6])}</span>
      </div>
      {error && <p class="error">{error}</p>}
      <div class="pl-week">
        {days.map((iso, i) => (
          <div class={`pl-day${iso === today ? ' is-today' : ''}`} key={iso}>
            <div class="pl-day-head"><strong>{DAY_NAMES[i]}</strong> <span class="muted">{fmtDay(iso)}</span></div>
            {MEALS.map((m) => renderSlot(iso, m))}
          </div>
        ))}
      </div>
      {dialog && (
        <MealDialog
          title={`${MEALS.find((m) => m.key === dialog.pasto)?.label} · ${fmtDay(dialog.data)}`}
          recipes={recipes}
          entry={dialog.entry}
          busy={busy}
          onSave={onSave}
          onDelete={dialog.entry ? onDelete : null}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
