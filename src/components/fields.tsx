import { useId, type ReactNode } from 'react';
import styles from './fields.module.css';

interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  /** Reçoit l'identifiant du champ et les attributs d'accessibilité à appliquer. */
  children: (control: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
  }) => ReactNode;
}

/** Libellé, aide et message d'erreur reliés au champ (lecteurs d'écran, §10.2). */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': !!error })}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
  maxLength?: number;
  inputMode?: 'text' | 'decimal';
  type?: 'text' | 'date';
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  type = 'text',
  ...rest
}: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <input
          {...control}
          {...rest}
          type={type}
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

/** Champ de montant : texte avec clavier numérique, lu sans flottant par le domaine. */
export function AmountField(props: Omit<TextFieldProps, 'inputMode' | 'type'>) {
  return <TextField {...props} inputMode="decimal" autoComplete="off" />;
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  error,
  maxLength,
}: Omit<TextFieldProps, 'type' | 'inputMode'>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <textarea
          {...control}
          className={`${styles.input} ${styles.textarea}`}
          value={value}
          maxLength={maxLength}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  hint?: string | undefined;
  error?: string | undefined;
  disabled?: boolean;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
  disabled,
}: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <select
          {...control}
          className={styles.input}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

interface SegmentedProps<V extends string> {
  legend: string;
  name: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (value: V) => void;
}

/** Choix exclusif présenté en pastilles (groupe de boutons radio accessible). */
export function Segmented<V extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: SegmentedProps<V>) {
  return (
    <fieldset className={styles.segmented}>
      <legend className={styles.srOnly}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.segment}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.checkbox}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
