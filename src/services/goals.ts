import { validateGoal, type GoalInput } from '../domain/goals';
import type { SavingsGoal } from '../domain/types';
import { hasErrors } from '../domain/validation';
import type { KoloRepositories } from '../data/repositories/types';
import { BusinessError, ValidationError } from './errors';

function clean(input: GoalInput): GoalInput {
  return { ...input, title: input.title.trim(), note: input.note.trim() };
}

/** Objectif suivi à la main : n'influence jamais un solde ni le budget (§5.8). */
export async function createGoal(repos: KoloRepositories, input: GoalInput): Promise<SavingsGoal> {
  const errors = validateGoal(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return repos.goals.create({ ...clean(input), archivedAt: null });
}

export async function updateGoal(
  repos: KoloRepositories,
  id: string,
  input: GoalInput,
): Promise<SavingsGoal> {
  const errors = validateGoal(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return repos.runAtomic(async () => {
    if (!(await repos.goals.getById(id))) throw new BusinessError('notFound');
    return repos.goals.update(id, clean(input));
  });
}

export async function deleteGoal(repos: KoloRepositories, id: string): Promise<void> {
  await repos.goals.remove(id);
}
