import { describe, it, expect } from 'vitest';
import { scaleIngredients, formatQuantity, parseRecipeText, parseIngredientLine, getRecipeWithIngredients } from './recipes.js';

describe('scaleIngredients', () => {
  const base = [
    { nome: 'Farina', quantita: 200, unita: 'gr', nota: '' },
    { nome: 'Uova', quantita: 2, unita: 'num.', nota: '' },
    { nome: 'Sale', quantita: '', unita: 'num.', nota: 'q.b.' },
  ];
  it('raddoppia', () => {
    const r = scaleIngredients(base, 2, 4);
    expect(r[0].quantita).toBe(400);
    expect(r[1].quantita).toBe(4);
    expect(r[2].quantita).toBe('');
  });
  it('dimezza e arrotonda', () => {
    expect(scaleIngredients(base, 4, 1)[0].quantita).toBe(50);
    expect(scaleIngredients(base, 4, 1)[1].quantita).toBe(0.5);
  });
  it('non muta input e gestisce stringhe', () => {
    const r = scaleIngredients([{ nome: 'x', quantita: '1,5', unita: 'lt' }], '2', 4);
    expect(r[0].quantita).toBe(3);
    expect(base[0].quantita).toBe(200);
  });
  it('formatQuantity converte', () => {
    expect(formatQuantity(1500, 'gr')).toBe('1,5 kg');
    expect(formatQuantity(3, 'num.')).toBe('3');
  });
});

describe('parseIngredientLine', () => {
  it('unita e quantita', () => {
    expect(parseIngredientLine('- 200 g di farina')).toMatchObject({ nome: 'farina', quantita: 200, unita: 'gr' });
    expect(parseIngredientLine('1/2 l latte')).toMatchObject({ nome: 'latte', quantita: 0.5, unita: 'lt' });
    expect(parseIngredientLine('2 uova')).toMatchObject({ nome: 'uova', quantita: 2, unita: 'num.' });
    expect(parseIngredientLine('1,5 dl panna')).toMatchObject({ quantita: 150, unita: 'ml' });
  });
  it('q.b.', () => {
    expect(parseIngredientLine('sale q.b.')).toMatchObject({ nome: 'sale', quantita: '' });
  });
});

describe('parseRecipeText', () => {
  it('con intestazioni', () => {
    const r = parseRecipeText('Torta\nPer 4 persone\nIngredienti\n200 g farina\n3 uova\nPreparazione\n1. Mescola\n2) Cuoci\nhttps://x.it/r');
    expect(r.titolo).toBe('Torta');
    expect(r.porzioni).toBe(4);
    expect(r.ingredienti).toHaveLength(2);
    expect(r.steps).toEqual(['Mescola', 'Cuoci']);
    expect(r.fonte).toBe('https://x.it/r');
  });
  it('senza intestazioni', () => {
    const r = parseRecipeText('Pasta\n- 100 g spaghetti\n- 2 pomodori\nCuocere la pasta in acqua salata per dieci minuti e poi scolare.');
    expect(r.ingredienti.map((i) => i.nome)).toEqual(['spaghetti', 'pomodori']);
    expect(r.steps).toHaveLength(1);
  });
});

describe('getRecipeWithIngredients', () => {
  it('unisce ricetta e ingredienti', async () => {
    const data = {
      recipes: [{ id: 'a', titolo: 'T', porzioni: '2' }],
      recipeIngredients: [
        { id: '1', ricettaId: 'a', ingrediente: 'Riso', quantita: '150', unita: 'gr' },
        { id: '2', ricettaId: 'b', ingrediente: 'X' },
      ],
    };
    const source = { list: async (e) => data[e] };
    const r = await getRecipeWithIngredients(source, 'a');
    expect(r.ingredienti).toEqual([{ nome: 'Riso', quantita: 150, unita: 'gr', nota: '' }]);
    expect(r.porzioni).toBe(2);
    expect(await getRecipeWithIngredients(source, 'zz')).toBeNull();
  });
});
