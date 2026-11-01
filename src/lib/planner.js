import { getRecipeWithIngredients, scaleIngredients } from './recipes.js';
import { addIngredients, removeByOrigin } from './shopping.js';

export const MEALS = [
  { key: 'colazione', label: 'Colazione' },
  { key: 'pranzo', label: 'Pranzo' },
  { key: 'cena', label: 'Cena' },
  { key: 'snack', label: 'Snack' },
];
export const DEFAULT_PERSONS = 2;

const pad = (n) => String(n).padStart(2, '0');

/** Data locale -> 'YYYY-MM-DD' */
export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' -> Date locale (mezzanotte) */
export function parseISO(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

/** Lunedì della settimana che contiene `date`. */
export function startOfWeek(date) {
  const offset = (date.getDay() + 6) % 7; // lun=0 ... dom=6
  return addDays(date, -offset);
}

/** Array di 7 date ISO (lun-dom) della settimana contenente `date`. */
export function weekDays(date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => toISO(addDays(start, i)));
}

export function shiftWeek(date, delta) {
  return addDays(startOfWeek(date), delta * 7);
}

export const VIEWS = [
  { key: 'settimana', label: 'Settimana' },
  { key: 'quindicina', label: 'Quindicina' },
  { key: 'mese', label: 'Mese' },
];

/**
 * Giorni del periodo contenente `anchor`. Ritorna { days: [iso|null], first, last }.
 * settimana = 7 giorni da lunedì; quindicina = 14 giorni da lunedì;
 * mese = mese di calendario, con `null` come riempimento iniziale per allinearsi al lunedì.
 */
export function periodDays(anchor, view) {
  if (view === 'mese') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const n = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const pad0 = (first.getDay() + 6) % 7;
    const days = [...Array(pad0).fill(null), ...Array.from({ length: n }, (_, i) => toISO(addDays(first, i)))];
    return { days, first: days[pad0], last: days[days.length - 1] };
  }
  const start = startOfWeek(anchor);
  const n = view === 'quindicina' ? 14 : 7;
  const days = Array.from({ length: n }, (_, i) => toISO(addDays(start, i)));
  return { days, first: days[0], last: days[n - 1] };
}

/** Sposta l'ancora di un periodo (settimana, 2 settimane o mese). */
export function shiftPeriod(anchor, view, delta) {
  if (view === 'mese') return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
  return addDays(startOfWeek(anchor), delta * (view === 'quindicina' ? 14 : 7));
}

/** Una giornata saltata è una riga Planner con pasto = 'saltato' (nessuna ricetta, nessun ingrediente). */
export const SKIP = 'saltato';

/** Set delle date ISO che hanno almeno un pasto (esclusi i giorni saltati). */
export const datesWithMeals = (rows) => new Set(rows.filter((r) => r.pasto !== SKIP).map(rowDate));

/** Set delle date ISO segnate come saltate. */
export const datesSkipped = (rows) => new Set(rows.filter((r) => r.pasto === SKIP).map(rowDate));

/** Segna o rimuove il "salta la giornata" per `iso`. */
export async function setSkipped(source, rows, iso, skipped) {
  const marks = rows.filter((r) => r.pasto === SKIP && rowDate(r) === iso);
  if (skipped && !marks.length) await source.create('planner', { data: iso, pasto: SKIP, ricettaId: '', persone: '' });
  if (!skipped) for (const m of marks) await source.delete('planner', m.id);
}

export const originOf =(plannerId) => `planner:${plannerId}`;

/** Normalizza il valore data di una riga (il foglio potrebbe restituire Date o stringa). */
export function rowDate(row) {
  const v = row.data;
  return v instanceof Date ? toISO(v) : String(v).slice(0, 10);
}

/** Indicizza le righe per `${data}|${pasto}` -> array (più pasti nello stesso slot sono ammessi). */
export function groupBySlot(rows) {
  const map = {};
  for (const r of rows) {
    const k = `${rowDate(r)}|${r.pasto}`;
    (map[k] ||= []).push(r);
  }
  return map;
}

async function pushIngredients(source, settings, recipeId, persone, plannerId) {
  const recipe = await getRecipeWithIngredients(source, recipeId);
  if (!recipe) throw new Error('Ricetta non trovata');
  const scaled = scaleIngredients(recipe.ingredienti || [], Number(recipe.porzioni) || 1, persone);
  await addIngredients(source, settings, scaled, originOf(plannerId));
}

export async function addMeal(source, settings, { data, pasto, ricettaId, persone = DEFAULT_PERSONS }) {
  const row = await source.create('planner', { data, pasto, ricettaId, persone });
  await pushIngredients(source, settings, ricettaId, persone, row.id);
  return row;
}

export async function updateMeal(source, settings, id, { ricettaId, persone }) {
  await removeByOrigin(source, originOf(id));
  const row = await source.update('planner', id, { ricettaId, persone });
  await pushIngredients(source, settings, ricettaId, persone, id);
  return row;
}

export async function removeMeal(source, id) {
  await removeByOrigin(source, originOf(id));
  await source.delete('planner', id);
}
