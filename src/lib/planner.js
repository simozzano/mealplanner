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

export const originOf = (plannerId) => `planner:${plannerId}`;

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
