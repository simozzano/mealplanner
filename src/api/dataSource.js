/**
 * Interfaccia DataSource (implementata da mockSource.js e gasSource.js).
 *
 *   list(entity)                -> Promise<Array<object>>
 *   create(entity, data)        -> Promise<object>   (assegna `id` se manca)
 *   update(entity, id, data)    -> Promise<object>   (merge dei campi)
 *   delete(entity, id)          -> Promise<void>
 *   loadSettings()              -> Promise<Settings>
 *
 * Settings = {
 *   categorie:    [{ nome, emoji }],
 *   ingredienti:  [{ nome, categoria, emoji }],
 *   supermercati: [{ nome }],
 *   tipiPasto:    [{ nome, colore }],
 * }
 *
 * Una riga = un oggetto con le intestazioni del foglio come chiavi.
 */

// Entità -> nome del foglio
export const ENTITIES = {
  recipes: 'Ricette',
  recipeIngredients: 'Ingredienti_Ricetta',
  shopping: 'Spesa',
  planner: 'Planner',
};

export function sheetOf(entity) {
  const s = ENTITIES[entity];
  if (!s) throw new Error(`Entità sconosciuta: ${entity}`);
  return s;
}

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
