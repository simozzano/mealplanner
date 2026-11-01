import { GAS_URL } from '../config.js';

/**
 * DataSource verso Google Apps Script.
 * POST con Content-Type text/plain (evita il preflight CORS); il token viaggia nel body.
 * Risposta attesa: { ok: true, data } oppure { ok: false, error }.
 */
export function createGasSource(token) {
  async function call(action, payload = {}) {
    if (!GAS_URL || GAS_URL.includes('INSERISCI_QUI')) {
      throw new Error('GAS_URL non configurato in src/config.js');
    }
    let res;
    try {
      res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token, action, ...payload }),
      });
    } catch {
      throw new Error('Server non raggiungibile');
    }
    if (!res.ok) throw new Error(`Errore server (HTTP ${res.status})`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Errore sconosciuto');
    return json.data;
  }

  return {
    name: 'gas',
    list: (entity) => call('list', { entity }),
    create: (entity, data) => call('create', { entity, data }),
    update: (entity, id, data) => call('update', { entity, id, data }),
    delete: (entity, id) => call('delete', { entity, id }).then(() => undefined),
    loadSettings: () => call('getSettings'),
  };
}
