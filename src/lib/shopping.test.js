import { describe, it, expect } from 'vitest';
import { convert, formatQty, planAdd, planRemove, planEdit, addIngredients, removeByOrigin, groupItems } from './shopping.js';

const settings = {
  categorie: [{ nome: 'Dispensa', emoji: '🫙' }, { nome: 'Bevande', emoji: '🥤' }],
  ingredienti: [{ nome: 'Farina', categoria: 'Dispensa', emoji: '🌾' }],
  supermercati: [],
};

function fakeSource(initial = []) {
  let rows = initial.map((r) => ({ ...r }));
  let n = 0;
  return {
    rows: () => rows,
    list: async () => rows.map((r) => ({ ...r })),
    create: async (_e, d) => { const r = { ...d, id: `n${++n}` }; rows.push(r); return r; },
    update: async (_e, id, d) => { const i = rows.findIndex((r) => r.id === id); rows[i] = { ...rows[i], ...d }; return rows[i]; },
    delete: async (_e, id) => { rows = rows.filter((r) => r.id !== id); },
  };
}

describe('conversioni', () => {
  it('gr<->kg e ml<->lt', () => {
    expect(convert(500, 'gr', 'kg')).toBe(0.5);
    expect(convert(2, 'kg', 'gr')).toBe(2000);
    expect(convert(250, 'ml', 'lt')).toBe(0.25);
    expect(convert(1, 'gr', 'ml')).toBeNull();
    expect(convert(1, 'num.', 'gr')).toBeNull();
  });
  it('formatQty', () => {
    expect(formatQty(1500, 'gr')).toBe('1,5 kg');
    expect(formatQty(3, 'num.')).toBe('3');
  });
});

describe('merge', () => {
  it('unisce nome case-insensitive con conversione', async () => {
    const src = fakeSource();
    await addIngredients(src, settings, [{ nome: 'Farina', quantita: 500, unita: 'gr' }], 'planner:1');
    await addIngredients(src, settings, [{ nome: 'farina', quantita: 1, unita: 'kg' }], 'planner:2');
    expect(src.rows()).toHaveLength(1);
    expect(src.rows()[0].quantita).toBe(1500);
    expect(src.rows()[0].unita).toBe('gr');
    expect(src.rows()[0].categoria).toBe('Dispensa');
    expect(JSON.parse(src.rows()[0].contributi)).toEqual({ 'planner:1': 500, 'planner:2': 1000 });
  });
  it('unità incompatibili restano distinte', () => {
    const { creates } = planAdd([], settings, [
      { nome: 'Latte', quantita: 1, unita: 'lt' },
      { nome: 'Latte', quantita: 2, unita: 'num.' },
      { nome: 'Latte', quantita: 500, unita: 'ml' },
    ], 'x');
    expect(creates).toHaveLength(2);
  });
  it('non unisce a voci già acquistate', () => {
    const rows = [{ id: 'a', nome: 'Sale', quantita: 1, unita: 'kg', acquistato: true }];
    const { creates, updates } = planAdd(rows, settings, [{ nome: 'Sale', quantita: 1, unita: 'kg' }], 'x');
    expect(creates).toHaveLength(1);
    expect(updates).toHaveLength(0);
  });
  it('merge nello stesso batch', () => {
    const { creates } = planAdd([], settings, [
      { nome: 'Uova', quantita: 2, unita: 'num.' }, { nome: 'uova', quantita: 3, unita: 'num.' },
    ], 'x');
    expect(creates).toHaveLength(1);
    expect(creates[0].quantita).toBe(5);
  });
});

describe('removeByOrigin', () => {
  it('sottrae il contributo e mantiene gli altri', async () => {
    const src = fakeSource();
    await addIngredients(src, settings, [{ nome: 'Farina', quantita: 500, unita: 'gr' }], 'planner:1');
    await addIngredients(src, settings, [{ nome: 'Farina', quantita: 1, unita: 'kg' }], 'planner:2');
    const r = await removeByOrigin(src, 'planner:1');
    expect(r.deleted).toHaveLength(0);
    expect(src.rows()[0].quantita).toBe(1000);
    expect(src.rows()[0].origine).toBe('planner:2');
  });
  it('elimina la voce se non resta nulla', async () => {
    const src = fakeSource();
    await addIngredients(src, settings, [{ nome: 'Uova', quantita: 2, unita: 'num.' }], 'planner:1');
    await removeByOrigin(src, 'planner:1');
    expect(src.rows()).toHaveLength(0);
  });
  it('mantiene la parte manuale', async () => {
    const src = fakeSource();
    await addIngredients(src, settings, [{ nome: 'Uova', quantita: 6, unita: 'num.' }], '');
    await addIngredients(src, settings, [{ nome: 'Uova', quantita: 2, unita: 'num.' }], 'planner:1');
    await removeByOrigin(src, 'planner:1');
    expect(src.rows()[0].quantita).toBe(6);
  });
  it('ignora voci acquistate', () => {
    const rows = [{ id: 'a', nome: 'Sale', quantita: 1, unita: 'kg', acquistato: 'TRUE', contributi: '{"p":1}' }];
    expect(planRemove(rows, 'p')).toEqual({ updates: [], deletes: [] });
  });
});

describe('planEdit / groupItems', () => {
  it('la quantità modificata diventa parte manuale', () => {
    const row = { nome: 'Farina', quantita: 500, unita: 'gr', contributi: '{"p":500}' };
    const e = planEdit(row, { quantita: 800 });
    expect(JSON.parse(e.contributi)).toEqual({ p: 500, manuale: 300 });
  });
  it('raggruppa seguendo l\'ordine delle categorie', () => {
    const g = groupItems([{ nome: 'a', categoria: 'Bevande' }, { nome: 'b', categoria: 'Dispensa' }, { nome: 'c', categoria: 'Zzz' }], settings);
    expect(g.map((x) => x.key)).toEqual(['Dispensa', 'Bevande', 'Zzz']);
  });
});
