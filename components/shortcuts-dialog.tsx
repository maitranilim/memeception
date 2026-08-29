'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { iconButton } from '@/lib/ui';

export const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Space'], description: 'Next meme' },
  { keys: ['→'], description: 'Next meme' },
  { keys: ['S'], description: 'Save or unsave the current meme' },
  { keys: ['C'], description: 'Copy a share link' },
  { keys: ['F'], description: 'Toggle the saved tab' },
  { keys: ['D'], description: 'Toggle dark and light theme' },
  { keys: ['⌘', 'K'], description: 'Open the command palette' },
  { keys: ['?'], description: 'Show this list' },
  { keys: ['Esc'], description: 'Close any overlay' },
];

export function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--app-overlay)' }}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-md rounded-lg border border-border-strong bg-surface"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 id="shortcuts-title" className="text-sm font-medium">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={iconButton}
            aria-label="Close"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <dl className="divide-y divide-border-subtle">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description + shortcut.keys.join()}
              className="flex items-center justify-between gap-4 px-4 py-2.5"
            >
              <dt className="text-sm text-muted">{shortcut.description}</dt>
              <dd className="flex shrink-0 gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="min-w-7 rounded border border-border-subtle bg-elevated px-1.5 py-0.5 text-center font-sans text-xs text-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
