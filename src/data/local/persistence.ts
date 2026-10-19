export type PersistenceStatus = 'granted' | 'denied' | 'unsupported';

function storageManager(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage;
}

/** Indique si le navigateur s'est engagé à ne pas effacer les données de lui-même. */
export async function checkPersistentStorage(): Promise<PersistenceStatus> {
  const storage = storageManager();
  if (!storage?.persisted || !storage.persist) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/**
 * Demande au navigateur de ne pas effacer automatiquement les données de Kolo
 * (Safari peut sinon les supprimer après quelques jours sans visite).
 * Demandé seulement sur action de l'utilisateur : Firefox affiche une autorisation.
 * Le navigateur peut refuser : c'est une protection en plus, pas une garantie.
 */
export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  const storage = storageManager();
  if (!storage?.persisted || !storage.persist) return 'unsupported';
  try {
    if (await storage.persisted()) return 'granted';
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
