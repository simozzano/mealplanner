import { MOCK_TOKEN } from '../config.js';
import { mockSource } from './mockSource.js';
import { createGasSource } from './gasSource.js';

/** Sceglie la DataSource in base al token: "mock" => dati locali, altrimenti Apps Script. */
export function createSource(token) {
  return token === MOCK_TOKEN ? mockSource : createGasSource(token);
}
