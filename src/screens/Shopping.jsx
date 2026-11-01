import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../context.jsx';
import { ItemForm } from './shopping/ItemForm.jsx';
import {
  addIngredients, groupItems, isBought, formatQty, lookupEmoji, planEdit, nameKey,
} from '../lib/shopping.js';
import '../styles/shopping.css';

export function Shopping() {
  const { source, settings } = useApp();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined chiuso, null nuova, oggetto = modifica
  const [groupBy, setGroupBy] = useState('categoria');
  const [market, setMarket] = useState('');

  const reload = () => source.list('shopping').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []);

  const run = async (fn) => {
    setError('');
    try { await fn(); await reload(); } catch (e) { setError(e.message); }
  };

  const toggle = (r) => run(() => source.update('shopping', r.id, { acquistato: !isBought(r.acquistato) }));
  const remove = (r) => run(() => source.delete('shopping', r.id));
  const clearBought = () => run(async () => {
    for (const r of rows.filter((x) => isBought(x.acquistato))) await source.delete('shopping', r.id);
  });

  const save = (data) => run(async () => {
    if (editing) {
      const { id, ...rest } = planEdit(editing, data);
      await source.update('shopping', editing.id, rest);
    } else {
      await addIngredients(source, settings, [data], '');
    }
    setEditing(undefined);
  });

  if (!rows) return <section><h1>Lista della Spesa</h1><p class="muted">{error || 'Caricamento…'}</p></section>;

  const markets = [...new Set([...settings.supermercati.map((s) => s.nome), ...rows.map((r) => r.supermercato).filter(Boolean)])];
  const visible = market ? rows.filter((r) => nameKey(r.supermercato) === nameKey(market)) : rows;
  const groups = groupItems(visible, settings, groupBy);
  const boughtCount = rows.filter((r) => isBought(r.acquistato)).length;
  const catEmoji = (k) => settings.categorie.find((c) => c.nome === k)?.emoji || '';

  return (
    <section>
      <h1>Lista della Spesa</h1>
      <div class="sp-bar">
        <div class="sp-bar-row">
          <button class="sp-btn-primary" onClick={() => setEditing(null)}>+ Aggiungi</button>
          <button disabled={!boughtCount} onClick={clearBought}>Svuota acquistati ({boughtCount})</button>
        </div>
        <div class="sp-bar-row">
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} aria-label="Raggruppa per">
            <option value="categoria">Per categoria</option>
            <option value="supermercato">Per supermercato</option>
          </select>
          <select value={market} onChange={(e) => setMarket(e.target.value)} aria-label="Filtra supermercato">
            <option value="">Tutti i supermercati</option>
            {markets.map((m) => <option value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      {error && <p class="error">{error}</p>}
      {!groups.length && <p class="muted">La lista è vuota.</p>}
      {groups.map((g) => (
        <div class="sp-group" key={g.key}>
          <h2>{groupBy === 'categoria' ? `${catEmoji(g.key)} ` : ''}{g.key}</h2>
          <ul class="sp-list">
            {g.items.map((r) => {
              const done = isBought(r.acquistato);
              return (
                <li class={`sp-item${done ? ' done' : ''}`} key={r.id}>
                  <input class="sp-check" type="checkbox" checked={done} onChange={() => toggle(r)} aria-label="Acquistato" />
                  <span class="sp-emoji">{lookupEmoji(r.nome, r.categoria, settings)}</span>
                  <button class="sp-main" onClick={() => setEditing(r)}>
                    <div class="sp-name">{r.nome}</div>
                    <div class="sp-sub">
                      {[r.nota, groupBy === 'categoria' ? r.supermercato : r.categoria].filter(Boolean).join(' · ')}
                    </div>
                  </button>
                  <span class="sp-qty">{formatQty(r.quantita, r.unita)}</span>
                  <button class="sp-del" onClick={() => remove(r)} aria-label="Elimina">🗑</button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {editing !== undefined && (
        <ItemForm item={editing} rows={rows} settings={settings} onSave={save} onCancel={() => setEditing(undefined)} />
      )}
    </section>
  );
}
