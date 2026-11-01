import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./recipes.js', () => ({
  getRecipeWithIngredients: vi.fn(async (_s, id) => ({
    id, porzioni: 2, ingredienti: [{ nome: 'Riso', quantita: 100, unita: 'gr', nota: '' }],
  })),
  scaleIngredients: vi.fn((ing, base, p) => ing.map((i) => ({ ...i, quantita: (i.quantita * p) / base }))),
}));
vi.mock('./shopping.js', () => ({
  addIngredients: vi.fn(async () => {}),
  removeByOrigin: vi.fn(async () => {}),
}));

import { startOfWeek, weekDays, shiftWeek, toISO, parseISO, groupBySlot, addMeal, updateMeal, removeMeal } from './planner.js';
import { addIngredients, removeByOrigin } from './shopping.js';

describe('settimana', () => {
  it('lunedì come inizio (domenica -> lunedì precedente)', () => {
    expect(toISO(startOfWeek(parseISO('2026-11-01')))).toBe('2026-10-26');
    expect(toISO(startOfWeek(parseISO('2026-10-26')))).toBe('2026-10-26');
    expect(toISO(startOfWeek(parseISO('2026-10-28')))).toBe('2026-10-26');
  });
  it('7 giorni lun-dom, attraversa il cambio mese', () => {
    const d = weekDays(parseISO('2026-10-28'));
    expect(d).toHaveLength(7);
    expect(d[0]).toBe('2026-10-26');
    expect(d[6]).toBe('2026-11-01');
  });
  it('navigazione settimane', () => {
    expect(toISO(shiftWeek(parseISO('2026-11-01'), 1))).toBe('2026-11-02');
    expect(toISO(shiftWeek(parseISO('2026-11-01'), -1))).toBe('2026-10-19');
  });
  it('groupBySlot', () => {
    const g = groupBySlot([{ id: 1, data: '2026-11-01', pasto: 'cena' }]);
    expect(g['2026-11-01|cena']).toHaveLength(1);
  });
});

describe('add/update/remove', () => {
  let source;
  beforeEach(() => {
    vi.clearAllMocks();
    source = {
      create: vi.fn(async (_e, d) => ({ ...d, id: 'p1' })),
      update: vi.fn(async (_e, id, d) => ({ id, ...d })),
      delete: vi.fn(async () => {}),
    };
  });

  it('addMeal salva la riga e aggiunge ingredienti scalati', async () => {
    await addMeal(source, {}, { data: '2026-11-02', pasto: 'pranzo', ricettaId: 'r1', persone: 4 });
    expect(source.create).toHaveBeenCalledWith('planner', { data: '2026-11-02', pasto: 'pranzo', ricettaId: 'r1', persone: 4 });
    const args = addIngredients.mock.calls[0];
    expect(args[2][0].quantita).toBe(200);
    expect(args[3]).toBe('planner:p1');
  });

  it('updateMeal rimuove i contributi precedenti e riaggiunge', async () => {
    await updateMeal(source, {}, 'p1', { ricettaId: 'r2', persone: 2 });
    expect(removeByOrigin).toHaveBeenCalledWith(source, 'planner:p1');
    expect(source.update).toHaveBeenCalledWith('planner', 'p1', { ricettaId: 'r2', persone: 2 });
    expect(addIngredients).toHaveBeenCalledTimes(1);
    expect(removeByOrigin.mock.invocationCallOrder[0]).toBeLessThan(addIngredients.mock.invocationCallOrder[0]);
  });

  it('removeMeal rimuove contributi e riga', async () => {
    await removeMeal(source, 'p1');
    expect(removeByOrigin).toHaveBeenCalledWith(source, 'planner:p1');
    expect(source.delete).toHaveBeenCalledWith('planner', 'p1');
  });
});
