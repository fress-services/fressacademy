import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

function classes(variant: ButtonVariant, block: boolean | undefined, extra?: string) {
  return [styles.button, styles[variant], block ? styles.block : '', extra ?? '']
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  block,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return <button type={type} className={classes(variant, block, className)} {...props} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  block?: boolean;
  children: ReactNode;
}

/** Lien qui a l'apparence d'un bouton (navigation vers un formulaire, par exemple). */
export function ButtonLink({ variant = 'primary', block, className, ...props }: ButtonLinkProps) {
  return <Link className={classes(variant, block, className)} {...props} />;
}
