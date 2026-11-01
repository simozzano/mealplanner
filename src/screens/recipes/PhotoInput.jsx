import { useRef, useState } from 'preact/hooks';
import { resizeImage } from '../../lib/recipes.js';

/** Selettore foto: ridimensiona nel browser e restituisce un dataURL JPEG. */
export function PhotoInput({ value, onChange, label = 'Aggiungi foto', small }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pick(e) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    setBusy(true); setErr('');
    try { onChange(await resizeImage(file, 1024)); } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  return (
    <div class={`rc-photo ${small ? 'small' : ''}`}>
      {value && <img src={value} alt="" />}
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      <button type="button" class="rc-btn" disabled={busy} onClick={() => ref.current.click()}>
        {busy ? 'Elaboro…' : value ? 'Cambia' : label}
      </button>
      {value && <button type="button" class="rc-btn rc-danger" onClick={() => onChange('')}>Rimuovi</button>}
      {err && <span class="error">{err}</span>}
    </div>
  );
}
