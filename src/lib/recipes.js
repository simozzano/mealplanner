/**
 * Logica Ricette (nessuna dipendenza dalla UI).
 *
 * SCHEMA FOGLI (stabile, usato anche dal Planner):
 *   Ricette:             id | titolo | tipo | porzioni | procedimento | foto | fonte | fotoStep
 *     - tipo: nome di un tipo pasto (Impostazioni_TipiPasto)
 *     - porzioni: numero di persone per cui sono scritte le quantita' (porzioni base)
 *     - procedimento: step separati da "\n" (uno per riga)
 *     - foto: copertina (dataURL in mock, URL Drive con GAS)
 *     - fotoStep: JSON array di stringhe allineato agli step ("" = nessuna foto)
 *     - fonte: testo libero o URL
 *   Ingredienti_Ricetta: id | ricettaId | ingrediente | quantita | unita | nota
 *     - unita ammesse: 'gr','kg','ml','lt','num.'
 *
 * API pubblica (contratto condiviso):
 *   getRecipeList(source)                                -> [ricetta]
 *   getRecipeWithIngredients(source, id)                 -> {...ricetta, ingredienti:[{nome,quantita,unita,nota}]} | null
 *   scaleIngredients(ingredienti, porzioniBase, persone) -> ingredienti con quantita scalata
 */

export const UNITS = ['gr', 'kg', 'ml', 'lt', 'num.'];

const num = (v) => {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------- scaling

function roundQty(q, unita) {
  if (unita === 'num.') return Math.round(q * 4) / 4; // quarti
  if (q >= 10) return Math.round(q);
  return Math.round(q * 100) / 100;
}

/** Scala le quantita' da `porzioniBase` a `persone`. Quantita' vuote/non numeriche restano vuote. */
export function scaleIngredients(ingredienti, porzioniBase, persone) {
  const base = num(porzioniBase) || 1;
  const p = num(persone) || base;
  const f = p / base;
  return (ingredienti || []).map((i) => {
    const q = num(i.quantita);
    return { ...i, quantita: q == null ? '' : roundQty(q * f, i.unita) };
  });
}

/** Formattazione per UI: 1000 gr -> "1 kg", 0.5 -> "0,5". */
export function formatQuantity(quantita, unita) {
  let q = num(quantita);
  if (q == null) return '';
  let u = unita || '';
  if (u === 'gr' && q >= 1000) { q /= 1000; u = 'kg'; }
  else if (u === 'ml' && q >= 1000) { q /= 1000; u = 'lt'; }
  const s = String(Math.round(q * 100) / 100).replace('.', ',');
  return u === 'num.' ? s : `${s} ${u}`.trim();
}

// ---------------------------------------------------------------- data access

export const splitSteps = (procedimento) =>
  String(procedimento || '').split('\n').map((s) => s.trim()).filter(Boolean);

export function parseStepPhotos(fotoStep) {
  try {
    const a = JSON.parse(fotoStep || '[]');
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

const normRecipe = (r) => ({ ...r, porzioni: num(r.porzioni) || 1 });
const normIng = (r) => ({
  nome: String(r.ingrediente ?? ''),
  quantita: num(r.quantita) ?? '',
  unita: r.unita || 'num.',
  nota: r.nota || '',
});

export async function getRecipeList(source) {
  const rows = await source.list('recipes');
  return rows.map(normRecipe).sort((a, b) => String(a.titolo).localeCompare(String(b.titolo), 'it'));
}

/** Indice ricettaId -> [nomi ingredienti in minuscolo], per la ricerca per ingredienti. */
export async function getIngredientIndex(source) {
  const ings = await source.list('recipeIngredients');
  const index = {};
  for (const i of ings) {
    const name = String(normIng(i).nome || '').trim().toLowerCase();
    if (name) (index[String(i.ricettaId)] ||= []).push(name);
  }
  return index;
}

const termMatches = (name, term) =>
  name.includes(term) || (name.length >= 3 && term.includes(name));

/**
 * Filtra per titolo (`q`) e/o per ingredienti disponibili (`terms`).
 * Ritorna [{recipe, matched, total}]; con `terms` esclude chi non ne ha nessuno
 * e ordina per ingredienti corrispondenti decrescenti.
 */
export function filterRecipes(recipes, index, { q = '', terms = [] } = {}) {
  const query = q.trim().toLowerCase();
  const ts = terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const items = (recipes || [])
    .filter((r) => !query || String(r.titolo).toLowerCase().includes(query))
    .map((recipe) => {
      const names = index?.[String(recipe.id)] || [];
      const matched = ts.length ? ts.filter((t) => names.some((n) => termMatches(n, t))).length : 0;
      return { recipe, matched, total: names.length };
    });
  if (!ts.length) return items;
  return items.filter((x) => x.matched > 0).sort((a, b) => b.matched - a.matched || a.total - b.total);
}

export async function getRecipeWithIngredients(source, recipeId) {
  const [recipes, ings] = await Promise.all([source.list('recipes'), source.list('recipeIngredients')]);
  const r = recipes.find((x) => String(x.id) === String(recipeId));
  if (!r) return null;
  return {
    ...normRecipe(r),
    ingredienti: ings.filter((i) => String(i.ricettaId) === String(recipeId)).map(normIng),
  };
}

async function deleteIngredientRows(source, recipeId) {
  const rows = await source.list('recipeIngredients');
  for (const r of rows.filter((x) => String(x.ricettaId) === String(recipeId))) {
    await source.delete('recipeIngredients', r.id);
  }
}

/**
 * Crea o aggiorna (se `id`) una ricetta con i suoi ingredienti.
 * recipe: {titolo,tipo,porzioni,fonte,foto,steps:[{testo,foto}]}; ingredienti: [{nome,quantita,unita,nota}]
 */
export async function saveRecipe(source, id, recipe, ingredienti) {
  const steps = (recipe.steps || [])
    .map((s) => ({ testo: String(s.testo || '').replace(/\s*\n+\s*/g, ' ').trim(), foto: s.foto || '' }))
    .filter((s) => s.testo);
  const cover = await uploadPhoto(source, recipe.foto);
  const stepPhotos = [];
  for (const s of steps) stepPhotos.push(await uploadPhoto(source, s.foto));
  const data = {
    titolo: recipe.titolo.trim(),
    tipo: recipe.tipo || '',
    porzioni: num(recipe.porzioni) || 1,
    procedimento: steps.map((s) => s.testo).join('\n'),
    foto: cover,
    fonte: recipe.fonte || '',
    fotoStep: stepPhotos.some(Boolean) ? JSON.stringify(stepPhotos) : '',
  };
  const saved = id ? await source.update('recipes', id, data) : await source.create('recipes', data);
  if (id) await deleteIngredientRows(source, id);
  for (const i of ingredienti) {
    if (!String(i.nome || '').trim()) continue;
    await source.create('recipeIngredients', {
      ricettaId: saved.id,
      ingrediente: i.nome.trim(),
      quantita: num(i.quantita) ?? '',
      unita: i.unita || 'num.',
      nota: i.nota || '',
    });
  }
  return saved;
}

export async function deleteRecipe(source, id) {
  await deleteIngredientRows(source, id);
  await source.delete('recipes', id);
}

// ---------------------------------------------------------------- foto

/** Ridimensiona un File immagine nel browser (canvas) -> dataURL JPEG. */
export function resizeImage(file, max = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non valida')); };
    img.src = url;
  });
}

/** Mock: restituisce il dataURL; GAS: carica su Drive e restituisce l'URL. */
export async function uploadPhoto(source, dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith('data:')) return dataUrl || '';
  return source.uploadPhoto ? source.uploadPhoto(dataUrl) : dataUrl;
}

// ---------------------------------------------------------------- parser "incolla testo"

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const UNIT_MAP = {
  g: ['gr', 1], gr: ['gr', 1], grammi: ['gr', 1], grammo: ['gr', 1],
  kg: ['kg', 1], chilo: ['kg', 1], chili: ['kg', 1], chilogrammi: ['kg', 1],
  ml: ['ml', 1], cl: ['ml', 10], dl: ['ml', 100],
  l: ['lt', 1], lt: ['lt', 1], litro: ['lt', 1], litri: ['lt', 1],
};
const ING_HEAD = /^(ingredienti|ingredients)\s*:?$/i;
const STEP_HEAD = /^(procedimento|preparazione|istruzioni|metodo|steps?|preparation|directions)\s*:?$/i;
const BULLET = /^\s*[-•*–·]\s+/;

function parseQty(s) {
  s = s.trim();
  if (FRACTIONS[s]) return FRACTIONS[s];
  let m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return +m[1] / +m[2];
  m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(/^\d+(?:[.,]\d+)?$/);
  return m ? parseFloat(s.replace(',', '.')) : null;
}

/** "200 g di farina" -> {nome:'farina',quantita:200,unita:'gr',nota:''}; null se non sembra un ingrediente. */
export function parseIngredientLine(line) {
  let s = line.replace(BULLET, '').trim();
  if (!s) return null;
  let nota = '';
  const par = s.match(/\(([^)]*)\)/);
  if (par) { nota = par[1].trim(); s = s.replace(par[0], ' ').replace(/\s+/g, ' ').trim(); }
  const m = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])\s*(.*)$/);
  if (!m) {
    const qb = s.match(/^(.*?)[,\s]+(q\.?\s?b\.?|quanto basta|a piacere|un pizzico)$/i);
    if (qb && qb[1]) return { nome: qb[1].trim(), quantita: '', unita: 'num.', nota: nota || qb[2] };
    return null;
  }
  let q = parseQty(m[1]);
  if (q == null) return null;
  let rest = m[2];
  let unita = 'num.';
  const um = rest.match(/^([a-zA-Z]+)\.?\s*(.*)$/);
  if (um && UNIT_MAP[um[1].toLowerCase()]) {
    const [u, k] = UNIT_MAP[um[1].toLowerCase()];
    unita = u;
    q *= k;
    rest = um[2];
  }
  const nome = rest.replace(/^(di|d')\s*/i, '').replace(/^[,:\-\s]+/, '').trim();
  if (!nome) return null;
  const parts = nome.split(',');
  const n = parts.shift().trim();
  const extra = parts.join(',').trim();
  return { nome: n, quantita: Math.round(q * 100) / 100, unita, nota: [nota, extra].filter(Boolean).join('; ') };
}

const cleanStep = (l) => l.replace(BULLET, '').replace(/^\s*(step\s*)?\d+\s*[.):\-]\s*/i, '').trim();

/**
 * Parser semplice per testo incollato (note, libri, social).
 * -> { titolo, porzioni|null, ingredienti:[...], steps:[string], fonte }
 */
export function parseRecipeText(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = { titolo: '', porzioni: null, ingredienti: [], steps: [], fonte: '' };
  let section = null; // null | 'ing' | 'step'
  let first = true;
  for (const line of lines) {
    if (/^https?:\/\/\S+$/i.test(line)) { out.fonte = line; continue; }
    if (ING_HEAD.test(line)) { section = 'ing'; first = false; continue; }
    if (STEP_HEAD.test(line)) { section = 'step'; first = false; continue; }
    const pm = line.match(/^(?:per|porzioni|dosi per|serves|persone)\s*:?\s*(\d+)/i);
    if (pm) { out.porzioni = +pm[1]; first = false; continue; }
    if (first) {
      first = false;
      if (!parseIngredientLine(line)) { out.titolo = line.replace(/^#+\s*/, ''); continue; }
    }
    if (section === 'ing') {
      const ing = parseIngredientLine(line);
      out.ingredienti.push(ing || { nome: line.replace(BULLET, ''), quantita: '', unita: 'num.', nota: '' });
    } else if (section === 'step') {
      const st = cleanStep(line);
      if (st) out.steps.push(st);
    } else {
      const ing = parseIngredientLine(line);
      if (ing && (BULLET.test(line) || ing.quantita !== '' || ing.nota) && line.length < 60) out.ingredienti.push(ing);
      else { const st = cleanStep(line); if (st) out.steps.push(st); }
    }
  }
  return out;
}
