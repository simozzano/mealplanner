/**
 * Logica della Lista della Spesa.
 *
 * Schema colonne del foglio `Spesa` (entità `shopping`):
 *   id            string  identificativo (assegnato dalla DataSource)
 *   nome          string  nome voce (il confronto per il merge è case-insensitive)
 *   categoria     string  nome categoria (da Impostazioni_Categorie)
 *   quantita      number  quantità totale, espressa in `unita`
 *   unita         string  gr | kg | ml | lt | num.
 *   nota          string  opzionale
 *   supermercato  string  opzionale
 *   acquistato    bool    true/false (accettati anche "TRUE", 1, "1", "si")
 *   origine       string  origini che contribuiscono alla voce, separate da "," (es. "planner:abc,planner:def").
 *                         Vuoto = solo inserimento manuale.
 *   contributi    string  JSON { [origine]: quantita } nell'unità della voce; la chiave "manuale"
 *                         indica la parte inserita a mano. Serve a removeByOrigin.
 *
 * Contratto condiviso con il Planner:
 *   addIngredients(source, settings, ingredienti, origine)  -> Promise<voci create/aggiornate>
 *   removeByOrigin(source, origine)                         -> Promise<{ updated, deleted }>
 *
 * Merge: stessa voce (nome case-insensitive) con unità della stessa famiglia
 * (gr/kg, ml/lt, num.) e non ancora acquistata. Famiglie diverse restano righe distinte.
 */

export const UNITS = ['gr', 'kg', 'ml', 'lt', 'num.'];
export const MANUALE = 'manuale';

const UNIT_INFO = {
  gr: { family: 'mass', factor: 1 },
  kg: { family: 'mass', factor: 1000 },
  ml: { family: 'vol', factor: 1 },
  lt: { family: 'vol', factor: 1000 },
  'num.': { family: 'count', factor: 1 },
};

const ALIASES = {
  g: 'gr', gr: 'gr', grammi: 'gr', grammo: 'gr',
  kg: 'kg', kilo: 'kg', kili: 'kg', chilo: 'kg',
  ml: 'ml', millilitri: 'ml',
  l: 'lt', lt: 'lt', litri: 'lt', litro: 'lt',
  'num.': 'num.', num: 'num.', n: 'num.', pz: 'num.', pezzi: 'num.', pezzo: 'num.', '': 'num.',
};

export function normalizeUnit(u) {
  const k = String(u ?? '').trim().toLowerCase();
  return ALIASES[k] ?? 'num.';
}

export const nameKey = (n) => String(n ?? '').trim().toLowerCase();
export const isBought = (v) => v === true || ['true', '1', 'si', 'sì', 'yes'].includes(String(v).trim().toLowerCase());
const round = (n) => Math.round(n * 1000) / 1000;
const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const unitFamily = (u) => UNIT_INFO[normalizeUnit(u)].family;
export const compatibleUnits = (a, b) => unitFamily(a) === unitFamily(b);

/** Converte una quantità fra unità della stessa famiglia; null se incompatibili. */
export function convert(q, from, to) {
  const f = UNIT_INFO[normalizeUnit(from)];
  const t = UNIT_INFO[normalizeUnit(to)];
  if (f.family !== t.family) return null;
  return round((num(q) * f.factor) / t.factor);
}

/** Testo "1,5 kg" (>=1000 gr/ml mostrati in kg/lt). */
export function formatQty(quantita, unita) {
  let q = num(quantita);
  let u = normalizeUnit(unita);
  if (u === 'gr' && q >= 1000) { q /= 1000; u = 'kg'; }
  if (u === 'ml' && q >= 1000) { q /= 1000; u = 'lt'; }
  const s = String(round(q)).replace('.', ',');
  return u === 'num.' ? `${s}` : `${s} ${u}`;
}

export function parseContributi(row) {
  if (row.contributi && typeof row.contributi === 'object') return { ...row.contributi };
  try {
    const o = JSON.parse(row.contributi || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch { return {}; }
}

function originList(contributi) {
  return Object.keys(contributi).filter((k) => k !== MANUALE).join(',');
}

/** Categoria nota per un nome (settings.ingredienti, poi voci già presenti). */
export function lookupCategoria(nome, settings, rows = []) {
  const k = nameKey(nome);
  if (!k) return '';
  const s = (settings?.ingredienti || []).find((i) => nameKey(i.nome) === k);
  if (s?.categoria) return s.categoria;
  const r = rows.find((x) => nameKey(x.nome) === k && x.categoria);
  return r ? r.categoria : '';
}

export function lookupEmoji(nome, categoria, settings) {
  const k = nameKey(nome);
  const i = (settings?.ingredienti || []).find((x) => nameKey(x.nome) === k);
  if (i?.emoji) return i.emoji;
  const c = (settings?.categorie || []).find((x) => x.nome === categoria);
  return c?.emoji || '🛒';
}

export const DEFAULT_CATEGORIA = 'Altro';

/**
 * Pianifica (puro, senza I/O) l'aggiunta di ingredienti.
 * ingredienti: [{nome, quantita, unita, nota?, categoria?, supermercato?}]
 * Ritorna { creates: [row], updates: [{id, data, row}] } dove row è la voce risultante.
 * Le righe create hanno un `tempId` fittizio finché non vengono salvate.
 */
export function planAdd(rows, settings, ingredienti, origine = '') {
  const work = rows.map((r) => ({ ...r }));
  const touched = new Map(); // key (id|tempId) -> {row, isNew}
  let tmp = 0;
  const key = origine ? origine : MANUALE;

  for (const ing of ingredienti) {
    const nome = String(ing.nome ?? '').trim();
    if (!nome) continue;
    const unita = normalizeUnit(ing.unita);
    const q = num(ing.quantita);
    const target = work.find(
      (r) => !isBought(r.acquistato) && nameKey(r.nome) === nameKey(nome) && compatibleUnits(r.unita, unita)
    );
    if (target) {
      const add = convert(q, unita, target.unita);
      const c = parseContributi(target);
      if (!Object.keys(c).length && num(target.quantita)) c[MANUALE] = num(target.quantita); // riga storica
      c[key] = round((c[key] || 0) + add);
      target.contributi = JSON.stringify(c);
      target.quantita = round(num(target.quantita) + add);
      target.origine = originList(c);
      if (ing.nota && !String(target.nota || '').includes(ing.nota)) {
        target.nota = target.nota ? `${target.nota}; ${ing.nota}` : ing.nota;
      }
      if (ing.supermercato && !target.supermercato) target.supermercato = ing.supermercato;
      touched.set(target.id ?? target.tempId, { row: target, isNew: !!target.tempId });
    } else {
      const c = { [key]: q };
      const row = {
        tempId: `tmp${++tmp}`,
        nome,
        categoria: ing.categoria || lookupCategoria(nome, settings, rows) || DEFAULT_CATEGORIA,
        quantita: q,
        unita,
        nota: ing.nota || '',
        supermercato: ing.supermercato || '',
        acquistato: false,
        origine: originList(c),
        contributi: JSON.stringify(c),
      };
      work.push(row);
      touched.set(row.tempId, { row, isNew: true });
    }
  }

  const creates = [];
  const updates = [];
  for (const { row, isNew } of touched.values()) {
    if (isNew) creates.push(row);
    else updates.push({ id: row.id, data: pick(row), row });
  }
  return { creates, updates };
}

const FIELDS = ['nome', 'categoria', 'quantita', 'unita', 'nota', 'supermercato', 'acquistato', 'origine', 'contributi'];
const pick = (row) => Object.fromEntries(FIELDS.map((f) => [f, row[f]]));

/**
 * Pianifica (puro) la rimozione dei contributi di `origine` dalle voci non acquistate.
 * Ritorna { updates: [{id, data, row}], deletes: [id] }.
 */
export function planRemove(rows, origine) {
  const updates = [];
  const deletes = [];
  for (const r of rows) {
    if (isBought(r.acquistato)) continue;
    const c = parseContributi(r);
    if (!(origine in c)) continue;
    const q = round(Math.max(0, num(r.quantita) - num(c[origine])));
    delete c[origine];
    const remaining = Object.values(c).reduce((a, b) => a + num(b), 0);
    if (!Object.keys(c).length || (q <= 0 && remaining <= 0)) {
      deletes.push(r.id);
    } else {
      const row = { ...r, quantita: q, contributi: JSON.stringify(c), origine: originList(c) };
      updates.push({ id: r.id, data: pick(row), row });
    }
  }
  return { updates, deletes };
}

/**
 * Pianifica (puro) la modifica manuale di una voce: aggiorna campi e mantiene coerenti i contributi
 * (la differenza rispetto ai contributi del Planner diventa la parte "manuale").
 */
export function planEdit(row, patch) {
  const next = { ...row, ...patch };
  next.unita = normalizeUnit(next.unita);
  next.quantita = num(next.quantita);
  let c = parseContributi(row);
  const oldUnit = normalizeUnit(row.unita);
  if (next.unita !== oldUnit) {
    const f = convert(1, oldUnit, next.unita);
    if (f === null) c = {};
    else for (const k of Object.keys(c)) c[k] = round(num(c[k]) * f);
  }
  delete c[MANUALE];
  const others = Object.values(c).reduce((a, b) => a + num(b), 0);
  const manual = round(next.quantita - others);
  if (manual > 0) c[MANUALE] = manual;
  else if (manual < 0) { // quantità scesa sotto i contributi: riscala proporzionalmente
    const k = others ? next.quantita / others : 0;
    for (const o of Object.keys(c)) c[o] = round(c[o] * k);
  }
  next.contributi = JSON.stringify(c);
  next.origine = originList(c);
  return next;
}

// ---- API con I/O (contratto condiviso) ----

export const listShopping = (source) => source.list('shopping');

/** Aggiunge/unisce ingredienti. Ritorna le voci create/aggiornate. */
export async function addIngredients(source, settings, ingredienti, origine = '') {
  const rows = await source.list('shopping');
  const { creates, updates } = planAdd(rows, settings, ingredienti, origine);
  const out = [];
  for (const u of updates) out.push(await source.update('shopping', u.id, u.data));
  for (const { tempId, ...data } of creates) out.push(await source.create('shopping', data));
  return out;
}

/** Rimuove/sottrae i contributi di `origine`. */
export async function removeByOrigin(source, origine) {
  const rows = await source.list('shopping');
  const { updates, deletes } = planRemove(rows, origine);
  const updated = [];
  for (const u of updates) updated.push(await source.update('shopping', u.id, u.data));
  for (const id of deletes) await source.delete('shopping', id);
  return { updated, deleted: deletes };
}

/** Raggruppa per categoria seguendo l'ordine di settings.categorie (ignote in coda). */
export function groupItems(rows, settings, by = 'categoria') {
  const map = new Map();
  for (const r of rows) {
    const k = by === 'supermercato' ? r.supermercato || 'Senza supermercato' : r.categoria || DEFAULT_CATEGORIA;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  const order = by === 'supermercato'
    ? (settings?.supermercati || []).map((s) => s.nome)
    : (settings?.categorie || []).map((c) => c.nome);
  const keys = [...map.keys()].sort((a, b) => {
    const ia = order.indexOf(a); const ib = order.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });
  return keys.map((k) => ({
    key: k,
    items: map.get(k).sort((a, b) => Number(isBought(a.acquistato)) - Number(isBought(b.acquistato)) || a.nome.localeCompare(b.nome)),
  }));
}
