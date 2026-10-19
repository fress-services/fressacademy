import {
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
  type ParsedBackup,
} from '../data/backup/json';
import type { DataSnapshot, KoloRepositories } from '../data/repositories/types';
import { DEFAULT_PREFERENCES } from '../domain/types';
import { APP_VERSION } from '../version';
import { ensureSystemCategories } from './categories';

/** Prépare le fichier de sauvegarde complète ; rien n'est modifié. */
export async function exportBackup(
  repos: KoloRepositories,
  now: Date = new Date(),
): Promise<{ fileName: string; content: string }> {
  const createdAt = now.toISOString();
  const backup = createBackup(await repos.readAll(), {
    schemaVersion: repos.schemaVersion(),
    appVersion: APP_VERSION,
    createdAt,
  });
  return { fileName: backupFileName(createdAt), content: serializeBackup(backup) };
}

/** Retient la date de la dernière sauvegarde téléchargée (rappel discret, §9.3). */
export async function markBackupDone(repos: KoloRepositories, now: Date = new Date()) {
  await repos.preferences.update({ lastBackupAt: now.toISOString() });
}

/** Lit et vérifie un fichier de sauvegarde sans rien écrire. */
export function readBackup(repos: KoloRepositories, text: string): ParsedBackup {
  return parseBackup(text, repos.schemaVersion());
}

/**
 * Remplace toutes les données par celles d'une sauvegarde déjà vérifiée (décision A7 :
 * remplacement seulement). Tout ou rien.
 */
export async function restoreBackup(repos: KoloRepositories, data: DataSnapshot): Promise<void> {
  await repos.replaceAll(data);
  await ensureSystemCategories(repos);
}

/**
 * Efface toutes les données locales de Kolo (§9.2) : l'application repart au premier
 * lancement. Seules la langue et le thème sont gardés, pour que l'écran suivant reste lisible.
 * Les fichiers déjà téléchargés ne sont pas concernés.
 */
export async function clearAllData(repos: KoloRepositories): Promise<void> {
  const { language, theme } = await repos.preferences.get();
  await repos.replaceAll({
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    debts: [],
    debtRepayments: [],
    plannedExpenses: [],
    goals: [],
    preferences: { ...DEFAULT_PREFERENCES, language, theme },
  });
  await ensureSystemCategories(repos);
}
