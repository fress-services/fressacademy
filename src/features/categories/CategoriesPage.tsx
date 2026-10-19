import { useState, type FormEvent } from 'react';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import type { Category, CategoryKind } from '../../domain/types';
import { LIMITS } from '../../domain/validation';
import { useI18n } from '../../i18n/context';
import { createCategory, renameCategory, setCategoryArchived } from '../../services/categories';
import { ValidationError } from '../../services/errors';
import { categoryLabel } from '../shared/labels';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import styles from './CategoriesPage.module.css';

type Status = { tone: 'success' | 'error'; text: string } | null;

export function CategoriesPage() {
  const { t } = useI18n();
  const ledger = useLedger();
  const [status, setStatus] = useState<Status>(null);

  return (
    <Page title={t('categories.title')} backTo="/more">
      {status && <Notice tone={status.tone}>{status.text}</Notice>}
      <p className={styles.hint}>{t('categories.archiveHint')}</p>
      <Loaded state={ledger}>
        {({ categories }) => (
          <>
            {(['expense', 'income'] as const).map((kind) => (
              <CategorySection
                key={kind}
                kind={kind}
                categories={categories.filter((category) => category.kind === kind)}
                onStatus={setStatus}
              />
            ))}
          </>
        )}
      </Loaded>
    </Page>
  );
}

function useSaveError() {
  const { t } = useI18n();
  return (error: unknown): string =>
    error instanceof ValidationError
      ? t(`validation.${(Object.values(error.fieldErrors)[0] ?? 'invalid') as 'invalid'}`)
      : t('errors.saveFailed', { reason: describeError(error, t) });
}

function CategorySection({
  kind,
  categories,
  onStatus,
}: {
  kind: CategoryKind;
  categories: Category[];
  onStatus: (status: Status) => void;
}) {
  const { t } = useI18n();
  const { repositories } = useData();
  const saveError = useSaveError();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const titleId = `categories-${kind}`;

  async function add(event: FormEvent) {
    event.preventDefault();
    try {
      await createCategory(repositories, { kind, name });
      setName('');
      setError(undefined);
      onStatus({ tone: 'success', text: t('categories.saved') });
    } catch (failure) {
      setError(saveError(failure));
    }
  }

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t(kind === 'expense' ? 'categories.expenseSection' : 'categories.incomeSection')}
      </h2>
      <ul className={styles.list}>
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} onStatus={onStatus} />
        ))}
      </ul>
      <form className={styles.addForm} onSubmit={add} noValidate>
        <TextField
          label={t(kind === 'expense' ? 'categories.newExpense' : 'categories.newIncome')}
          value={name}
          onChange={setName}
          error={error}
          maxLength={LIMITS.categoryName}
          autoComplete="off"
        />
        <Button type="submit" variant="secondary">
          {t('categories.add')}
        </Button>
      </form>
    </section>
  );
}

function CategoryRow({
  category,
  onStatus,
}: {
  category: Category;
  onStatus: (status: Status) => void;
}) {
  const { t } = useI18n();
  const { repositories } = useData();
  const saveError = useSaveError();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const label = categoryLabel(category, t);

  async function rename(event: FormEvent) {
    event.preventDefault();
    try {
      await renameCategory(repositories, category.id, name);
      setEditing(false);
      setError(undefined);
      onStatus({ tone: 'success', text: t('categories.saved') });
    } catch (failure) {
      setError(saveError(failure));
    }
  }

  async function toggleArchive() {
    try {
      await setCategoryArchived(repositories, category.id, !category.archivedAt);
      onStatus({ tone: 'success', text: t('categories.saved') });
    } catch (failure) {
      onStatus({ tone: 'error', text: saveError(failure) });
    }
  }

  if (editing) {
    return (
      <li className={styles.row}>
        <form className={styles.renameForm} onSubmit={rename} noValidate>
          <TextField
            label={t('categories.nameLabel')}
            value={name}
            onChange={setName}
            error={error}
            maxLength={LIMITS.categoryName}
            autoComplete="off"
          />
          <div className={styles.actions}>
            <Button type="submit">{t('common.save')}</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`${styles.row} ${category.archivedAt ? styles.archived : ''}`}>
      <span className={styles.label}>
        <span className={styles.name}>{label}</span>
        <span className={styles.meta}>
          {[
            category.systemKey ? t('categories.systemHint') : null,
            category.archivedAt ? t('categories.archivedTag') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span className={styles.actions}>
        {!category.systemKey && (
          <Button
            variant="ghost"
            aria-label={`${t('categories.rename')} ${label}`}
            onClick={() => {
              setName(category.customName ?? '');
              setError(undefined);
              setEditing(true);
            }}
          >
            {t('categories.rename')}
          </Button>
        )}
        <Button
          variant="ghost"
          aria-label={`${t(category.archivedAt ? 'categories.unarchive' : 'categories.archive')} ${label}`}
          onClick={toggleArchive}
        >
          {t(category.archivedAt ? 'categories.unarchive' : 'categories.archive')}
        </Button>
      </span>
    </li>
  );
}
