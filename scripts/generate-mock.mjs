// Genera mock/mock.xlsx (e la copia in public/mock/ per essere servita in dev/build).
// Solo dati fittizi. Uso: npm run mock:generate
import * as XLSX from 'xlsx';
import { mkdirSync, copyFileSync } from 'node:fs';

const categorie = [
  { nome: 'Frutta e verdura', emoji: '🥬' },
  { nome: 'Carne e pesce', emoji: '🥩' },
  { nome: 'Latticini e uova', emoji: '🧀' },
  { nome: 'Pane e pasta', emoji: '🍝' },
  { nome: 'Dispensa', emoji: '🫙' },
  { nome: 'Bevande', emoji: '🥤' },
];

const ingredienti = [
  ['Pomodori', 'Frutta e verdura', '🍅'], ['Cipolla', 'Frutta e verdura', '🧅'],
  ['Aglio', 'Frutta e verdura', '🧄'], ['Carote', 'Frutta e verdura', '🥕'],
  ['Patate', 'Frutta e verdura', '🥔'], ['Zucchine', 'Frutta e verdura', '🥒'],
  ['Melanzane', 'Frutta e verdura', '🍆'], ['Peperoni', 'Frutta e verdura', '🫑'],
  ['Insalata', 'Frutta e verdura', '🥗'], ['Limone', 'Frutta e verdura', '🍋'],
  ['Mele', 'Frutta e verdura', '🍎'], ['Banane', 'Frutta e verdura', '🍌'],
  ['Basilico', 'Frutta e verdura', '🌿'], ['Funghi', 'Frutta e verdura', '🍄'],
  ['Pollo', 'Carne e pesce', '🍗'], ['Manzo macinato', 'Carne e pesce', '🥩'],
  ['Salmone', 'Carne e pesce', '🐟'], ['Gamberi', 'Carne e pesce', '🦐'],
  ['Prosciutto', 'Carne e pesce', '🥓'],
  ['Latte', 'Latticini e uova', '🥛'], ['Uova', 'Latticini e uova', '🥚'],
  ['Mozzarella', 'Latticini e uova', '🧀'], ['Parmigiano', 'Latticini e uova', '🧀'],
  ['Burro', 'Latticini e uova', '🧈'], ['Yogurt', 'Latticini e uova', '🍦'],
  ['Spaghetti', 'Pane e pasta', '🍝'], ['Riso', 'Pane e pasta', '🍚'],
  ['Pane', 'Pane e pasta', '🍞'], ['Farina', 'Pane e pasta', '🌾'],
  ["Olio d'oliva", 'Dispensa', '🫒'], ['Sale', 'Dispensa', '🧂'],
  ['Zucchero', 'Dispensa', '🍬'], ['Passata di pomodoro', 'Dispensa', '🥫'],
  ['Miele', 'Dispensa', '🍯'], ['Caffè', 'Dispensa', '☕'],
  ['Acqua', 'Bevande', '💧'], ['Vino bianco', 'Bevande', '🍷'], ["Succo d'arancia", 'Bevande', '🍊'],
].map(([nome, categoria, emoji]) => ({ nome, categoria, emoji }));

const supermercati = ['Coop', 'Esselunga', 'Lidl'].map((nome) => ({ nome }));

const tipiPasto = [
  { nome: 'Colazione', colore: '#f6ad55' }, { nome: 'Antipasto', colore: '#68d391' },
  { nome: 'Primo', colore: '#f6e05e' }, { nome: 'Secondo', colore: '#fc8181' },
  { nome: 'Contorno', colore: '#9ae6b4' }, { nome: 'Zuppa', colore: '#fbb6ce' },
  { nome: 'Dolce', colore: '#d6bcfa' }, { nome: 'Cocktail', colore: '#63b3ed' },
];

const ricette = [
  { id: 'r1', titolo: 'Spaghetti al pomodoro', tipo: 'Primo', porzioni: 2, procedimento: "Soffriggere aglio nell'olio.\nAggiungere la passata e cuocere 15 minuti.\nCuocere gli spaghetti e condire con basilico.", foto: '', fonte: '', fotoStep: '' },
  { id: 'r2', titolo: 'Insalata di pollo', tipo: 'Secondo', porzioni: 2, procedimento: 'Grigliare il pollo.\nTagliare insalata e pomodori.\nCondire con olio, sale e limone.', foto: '', fonte: '', fotoStep: '' },
  { id: 'r3', titolo: 'Pancake alle banane', tipo: 'Colazione', porzioni: 4, procedimento: "Schiacciare le banane.\nMescolare con uova, latte e farina.\nCuocere in padella con un po' di burro.", foto: '', fonte: '', fotoStep: '' },
];

const ingRicetta = [
  ['r1', 'Spaghetti', 160, 'gr'], ['r1', 'Passata di pomodoro', 300, 'ml'], ['r1', 'Aglio', 1, 'num.'],
  ['r1', "Olio d'oliva", 20, 'ml'], ['r1', 'Basilico', 5, 'gr'],
  ['r2', 'Pollo', 300, 'gr'], ['r2', 'Insalata', 150, 'gr'], ['r2', 'Pomodori', 2, 'num.'],
  ['r2', 'Limone', 1, 'num.'], ['r2', "Olio d'oliva", 15, 'ml'],
  ['r3', 'Banane', 2, 'num.'], ['r3', 'Uova', 2, 'num.'], ['r3', 'Latte', 200, 'ml'],
  ['r3', 'Farina', 200, 'gr'], ['r3', 'Burro', 20, 'gr'],
].map(([ricettaId, ingrediente, quantita, unita], i) => ({ id: 'i' + (i + 1), ricettaId, ingrediente, quantita, unita, nota: '' }));

// Fogli vuoti: l'header deve esistere comunque
const spesaHeader = ['id', 'nome', 'categoria', 'quantita', 'unita', 'nota', 'supermercato', 'acquistato', 'origine', 'contributi'];
const spesa = [
  ['s1', 'Latte', 'Latticini e uova', 2, 'lt', 'intero', 'Coop', false],
  ['s2', 'Pomodori', 'Frutta e verdura', 500, 'gr', '', 'Esselunga', false],
  ['s3', 'Pane', 'Pane e pasta', 1, 'num.', '', '', true],
].map(([id, nome, categoria, quantita, unita, nota, supermercato, acquistato]) => ({
  id, nome, categoria, quantita, unita, nota, supermercato, acquistato, origine: '',
  contributi: JSON.stringify({ manuale: quantita }),
}));
const plannerHeader = ['id', 'data', 'pasto', 'ricettaId', 'persone'];

const wb = XLSX.utils.book_new();
const add = (name, rows, header) =>
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, header ? { header } : undefined), name);

add('Ricette', ricette);
add('Ingredienti_Ricetta', ingRicetta);
add('Spesa', spesa, spesaHeader);
add('Planner', [], plannerHeader);
add('Impostazioni_Categorie', categorie);
add('Impostazioni_Ingredienti', ingredienti);
add('Supermercati', supermercati);
add('Impostazioni_TipiPasto', tipiPasto);

mkdirSync('mock', { recursive: true });
mkdirSync('public/mock', { recursive: true });
XLSX.writeFile(wb, 'mock/mock.xlsx');
copyFileSync('mock/mock.xlsx', 'public/mock/mock.xlsx');
console.log('Generato mock/mock.xlsx (copia in public/mock/)');
