/**
 * Meal Planner - Web App Google Apps Script (scheletro Fase 0).
 *
 * Setup:
 *  1. Crea un Google Sheet con i fogli (prima riga = intestazioni):
 *     Ricette, Ingredienti_Ricetta, Spesa, Planner,
 *     Impostazioni_Categorie, Impostazioni_Ingredienti, Supermercati, Impostazioni_TipiPasto
 *     (puoi importare mock/mock.xlsx come punto di partenza).
 *  2. Estensioni > Apps Script: incolla questo file.
 *  3. Impostazioni progetto > Proprietà dello script: aggiungi TOKEN = <la tua password>.
 *  4. Distribuisci > Nuova distribuzione > Web App:
 *     esegui come "Me", accesso "Chiunque". Copia l'URL in src/config.js (GAS_URL).
 *
 * Protocollo: POST con body JSON (Content-Type text/plain)
 *   { token, action, entity?, id?, data? }
 * Risposta: { ok: true, data } | { ok: false, error }
 */

// Entità usate dal client -> nome del foglio
var ENTITIES = {
  recipes: 'Ricette',
  recipeIngredients: 'Ingredienti_Ricetta',
  shopping: 'Spesa',
  planner: 'Planner'
};

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);

    // Controllo token (Script Properties > TOKEN)
    var expected = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!expected || req.token !== expected) {
      return json_({ ok: false, error: 'Token non valido' });
    }

    switch (req.action) {
      case 'getSettings': return json_({ ok: true, data: getSettings_() });
      case 'list':   return json_({ ok: true, data: list_(req.entity) });
      case 'create': return json_({ ok: true, data: create_(req.entity, req.data) });
      case 'update': return json_({ ok: true, data: update_(req.entity, req.id, req.data) });
      case 'delete': delete_(req.entity, req.id); return json_({ ok: true, data: null });
      default: return json_({ ok: false, error: 'Azione sconosciuta: ' + req.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

// ---------- Helper ----------

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Foglio mancante: ' + name);
  return sh;
}

function entitySheet_(entity) {
  var name = ENTITIES[entity];
  if (!name) throw new Error('Entità sconosciuta: ' + entity);
  return sheet_(name);
}

// Legge un foglio come array di oggetti (prima riga = chiavi)
function readSheet_(sh) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1)
    .filter(function (row) { return row.some(function (c) { return c !== ''; }); })
    .map(function (row) {
      var o = {};
      headers.forEach(function (h, i) { o[h] = row[i] instanceof Date ? row[i].toISOString() : row[i]; });
      return o;
    });
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

// Cerca la riga (indice 1-based nel foglio) con id dato; -1 se assente
function findRow_(sh, id) {
  var headers = headers_(sh);
  var idCol = headers.indexOf('id');
  if (idCol < 0) throw new Error('Colonna id mancante');
  var ids = sh.getRange(2, idCol + 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function rowFromObject_(headers, obj) {
  return headers.map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
}

// ---------- Azioni CRUD generiche ----------

function list_(entity) {
  return readSheet_(entitySheet_(entity));
}

function create_(entity, data) {
  var sh = entitySheet_(entity);
  var obj = Object.assign({}, data, { id: (data && data.id) || Utilities.getUuid() });
  sh.appendRow(rowFromObject_(headers_(sh), obj));
  return obj;
}

function update_(entity, id, data) {
  var sh = entitySheet_(entity);
  var rowIdx = findRow_(sh, id);
  if (rowIdx < 0) throw new Error('Elemento non trovato');
  var headers = headers_(sh);
  var current = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  var obj = {};
  headers.forEach(function (h, i) { obj[h] = current[i]; });
  Object.keys(data || {}).forEach(function (k) { if (k !== 'id') obj[k] = data[k]; });
  sh.getRange(rowIdx, 1, 1, headers.length).setValues([rowFromObject_(headers, obj)]);
  return obj;
}

function delete_(entity, id) {
  var sh = entitySheet_(entity);
  var rowIdx = findRow_(sh, id);
  if (rowIdx < 0) throw new Error('Elemento non trovato');
  sh.deleteRow(rowIdx);
}

// ---------- Impostazioni (restituite al login) ----------

function getSettings_() {
  return {
    categorie: readSheet_(sheet_('Impostazioni_Categorie')),
    ingredienti: readSheet_(sheet_('Impostazioni_Ingredienti')),
    supermercati: readSheet_(sheet_('Supermercati')),
    tipiPasto: readSheet_(sheet_('Impostazioni_TipiPasto'))
  };
}

// TODO (sezione Ricette): upload foto su Drive (action 'uploadPhoto').
