import { SYSTEM_CATEGORIES } from '../domain/categories';
import type { Category, CategoryKind } from '../domain/types';
import { validateCategoryName } from '../domain/validation';
import type { KoloRepositories } from '../data/repositories/types';
import { BusinessError, ValidationError } from './errors';

/**
 * Ajoute les catégories système qui manquent (premier lancement ou nouvelle version de Kolo).
 * Sans effet si elles existent déjà, même archivées.
 */
export async function ensureSystemCategories(repos: KoloRepositories): Promise<void> {
  await repos.runAtomic(async () => {
    const existing = new Set((await repos.categories.list()).map((category) => category.systemKey));
    for (const { key, kind } of SYSTEM_CATEGORIES) {
      if (existing.has(key)) continue;
      await repos.categories.create({
        kind,
        systemKey: key,
        customName: null,
        icon: null,
        color: null,
        archivedAt: null,
      });
    }
  });
}

/** Ordre d'affichage : catégories système dans l'ordre prévu, puis personnelles par nom. */
export function sortCategories(categories: readonly Category[]): Category[] {
  const order = new Map(SYSTEM_CATEGORIES.map(({ key }, index) => [key, index]));
  return [...categories].sort((a, b) => {
    const rankA = a.systemKey ? (order.get(a.systemKey) ?? 999) : 1000;
    const rankB = b.systemKey ? (order.get(b.systemKey) ?? 999) : 1000;
    if (rankA !== rankB) return rankA - rankB;
    return (a.customName ?? '').localeCompare(b.customName ?? '');
  });
}

export async function createCategory(
  repos: KoloRepositories,
  input: { kind: CategoryKind; name: string },
): Promise<Category> {
  const error = validateCategoryName(input.name);
  if (error) throw new ValidationError({ name: error });
  return repos.categories.create({
    kind: input.kind,
    systemKey: null,
    customName: input.name.trim(),
    icon: null,
    color: null,
    archivedAt: null,
  });
}

/** Renomme une catégorie personnelle ; une catégorie système garde son nom traduit. */
export async function renameCategory(
  repos: KoloRepositories,
  id: string,
  name: string,
): Promise<Category> {
  const category = await repos.categories.getById(id);
  if (!category) throw new BusinessError('notFound');
  if (category.systemKey) throw new BusinessError('systemCategory');
  const error = validateCategoryName(name);
  if (error) throw new ValidationError({ name: error });
  return repos.categories.update(id, { customName: name.trim() });
}

/** Archiver ne touche pas à l'historique : les opérations gardent leur catégorie (§5.4). */
export async function setCategoryArchived(
  repos: KoloRepositories,
  id: string,
  archived: boolean,
  now: Date = new Date(),
): Promise<Category> {
  return repos.categories.update(id, { archivedAt: archived ? now.toISOString() : null });
}
