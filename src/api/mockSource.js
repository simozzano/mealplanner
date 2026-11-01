import * as XLSX from 'xlsx';
import { sheetOf, newId } from './dataSource.js';

const STORE_KEY = 'mp_mock_data'; // { [entity]: Array<object> } solo per le entità modificate
const MOCK_URL = `${import.meta.env.BASE_URL}mock/mock.xlsx`;

let workbookPromise = null;

function loadWorkbook() {
  if (!workbookPromise) {
    workbookPromise = fetch(MOCK_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Impossibile caricare mock.xlsx (HTTP ${r.status})`);
        return r.arrayBuffer();
      })
      .then((buf) => XLSX.read(buf, { type: 'array' }))
      .catch((e) => {
        workbookPromise = null;
        throw e;
      });
  }
  return workbookPromise;
}

async function sheetRows(name) {
  const wb = await loadWorkbook();
  const ws = wb.Sheets[name];
  return ws ? XLSX.utils.sheet_to_json(ws, { defval: '' }) : [];
}

const readStore = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
};
const writeStore = (s) => localStorage.setItem(STORE_KEY, JSON.stringify(s));

async function getRows(entity) {
  const store = readStore();
  if (store[entity]) return store[entity];
  return sheetRows(sheetOf(entity));
}

function saveRows(entity, rows) {
  const store = readStore();
  store[entity] = rows;
  writeStore(store);
}

export const mockSource = {
  name: 'mock',

  async list(entity) {
    return getRows(entity);
  },

  async create(entity, data) {
    const rows = await getRows(entity);
    const row = { ...data, id: data.id || newId() };
    saveRows(entity, [...rows, row]);
    return row;
  },

  async update(entity, id, data) {
    const rows = await getRows(entity);
    let updated = null;
    const next = rows.map((r) => (String(r.id) === String(id) ? (updated = { ...r, ...data, id: r.id }) : r));
    if (!updated) throw new Error('Elemento non trovato');
    saveRows(entity, next);
    return updated;
  },

  async delete(entity, id) {
    const rows = await getRows(entity);
    saveRows(entity, rows.filter((r) => String(r.id) !== String(id)));
  },

  async loadSettings() {
    const [categorie, ingredienti, supermercati, tipiPasto] = await Promise.all([
      sheetRows('Impostazioni_Categorie'),
      sheetRows('Impostazioni_Ingredienti'),
      sheetRows('Supermercati'),
      sheetRows('Impostazioni_TipiPasto'),
    ]);
    return { categorie, ingredienti, supermercati, tipiPasto };
  },

  /** Cancella le modifiche locali e ripristina i dati del file xlsx. */
  reset() {
    localStorage.removeItem(STORE_KEY);
  },
};

export function resetMock() {
  mockSource.reset();
}
