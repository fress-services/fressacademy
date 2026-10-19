import { KoloDatabase } from '../data/local/db';

let counter = 0;

/** Nom de base unique : chaque test part d'une base vide (IndexedDB simulée en mémoire). */
export function uniqueDatabaseName(): string {
  counter += 1;
  return `kolo-test-${counter}-${Math.random().toString(36).slice(2)}`;
}

export function newTestDatabase(): KoloDatabase {
  return new KoloDatabase(uniqueDatabaseName());
}
