import { useState } from 'preact/hooks';
import { UNITS, lookupCategoria, normalizeUnit } from '../../lib/shopping.js';

/** Dialog di aggiunta/modifica voce. `item` null = nuova. */
export function ItemForm({ item, rows, settings, onSave, onCancel }) {
  const [nome, setNome] = useState(item?.nome || '');
  const [categoria, setCategoria] = useState(item?.categoria || '');
  const [quantita, setQuantita] = useState(item ? String(item.quantita) : '1');
  const [unita, setUnita] = useState(item ? normalizeUnit(item.unita) : 'num.');
  const [nota, setNota] = useState(item?.nota || '');
  const [supermercato, setSupermercato] = useState(item?.supermercato || '');
  const [catTouched, setCatTouched] = useState(!!item);

  const known = lookupCategoria(nome, settings, rows);
  const names = [...new Set([...settings.ingredienti.map((i) => i.nome), ...rows.map((r) => r.nome)])];
  const markets = [...new Set([...settings.supermercati.map((s) => s.nome), ...rows.map((r) => r.supermercato).filter(Boolean)])];

  const onName = (v) => {
    setNome(v);
    if (!catTouched) setCategoria(lookupCategoria(v, settings, rows));
  };
  const effCat = categoria || known;
  const needCat = !known;

  const submit = (e) => {
    e.preventDefault();
    if (!nome.trim() || (needCat && !effCat)) return;
    onSave({
      nome: nome.trim(), categoria: effCat, unita,
      quantita: parseFloat(String(quantita).replace(',', '.')) || 0,
      nota: nota.trim(), supermercato: supermercato.trim(),
    });
  };

  return (
    <div class="sp-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <form class="sp-dialog" onSubmit={submit}>
        <h2>{item ? 'Modifica voce' : 'Nuova voce'}</h2>
        <label>Nome
          <input list="sp-names" value={nome} required autoFocus onInput={(e) => onName(e.target.value)} />
          <datalist id="sp-names">{names.map((n) => <option value={n} />)}</datalist>
        </label>
        <label>Categoria{needCat ? ' *' : ''}
          <select value={effCat} required={needCat}
            onChange={(e) => { setCategoria(e.target.value); setCatTouched(true); }}>
            <option value="">{known ? `${known} (auto)` : '— scegli —'}</option>
            {settings.categorie.map((c) => <option value={c.nome}>{c.emoji} {c.nome}</option>)}
          </select>
        </label>
        <div class="sp-row2">
          <label>Quantità
            <input type="text" inputMode="decimal" value={quantita} onInput={(e) => setQuantita(e.target.value)} />
          </label>
          <label>Unità
            <select value={unita} onChange={(e) => setUnita(e.target.value)}>
              {UNITS.map((u) => <option value={u}>{u}</option>)}
            </select>
          </label>
        </div>
        <label>Nota
          <input value={nota} onInput={(e) => setNota(e.target.value)} />
        </label>
        <label>Supermercato
          <input list="sp-markets" value={supermercato} onInput={(e) => setSupermercato(e.target.value)} />
          <datalist id="sp-markets">{markets.map((n) => <option value={n} />)}</datalist>
        </label>
        <div class="sp-actions">
          <button type="button" onClick={onCancel}>Annulla</button>
          <button type="submit" class="sp-btn-primary">Salva</button>
        </div>
      </form>
    </div>
  );
}
