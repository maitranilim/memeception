/**
 * Shared control styles. Hover feedback is a colour change only — no scale,
 * shadow, or translate.
 */
export const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed';

export const buttonPrimary = `${buttonBase} border-transparent bg-accent text-accent-foreground hover:bg-accent-hover px-4 h-10`;

export const buttonSecondary = `${buttonBase} border-border-subtle bg-surface text-foreground hover:bg-elevated px-3 h-9`;

export const iconButton =
  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-muted hover:bg-elevated hover:text-foreground disabled:opacity-50';

export const card = 'rounded-lg border border-border-subtle bg-surface';
