'use client';

import type { LucideIcon } from 'lucide-react';
import { Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export type Command = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string;
  icon?: LucideIcon;
  run: () => void;
};

function matches(command: Command, query: string): boolean {
  if (!query) return true;
  const haystack =
    `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (haystack.includes(needle)) return true;

  // Subsequence match, so "pgh" finds "Programmer Humor".
  let index = 0;
  for (const char of needle.replace(/\s+/g, '')) {
    index = haystack.indexOf(char, index);
    if (index === -1) return false;
    index += 1;
  }
  return true;
}

/**
 * Mounted only while open, so each launch starts from a clean query and
 * selection without an effect to reset them.
 */
export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}) {
  if (!open) return null;
  return <PaletteDialog onClose={onClose} commands={commands} />;
}

function PaletteDialog({
  onClose,
  commands,
}: {
  onClose: () => void;
  commands: Command[];
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(
    () => commands.filter((command) => matches(command, query)),
    [commands, query],
  );

  // Clamp rather than reset in an effect: the list can shrink under us.
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const groups = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const command of results) {
      const bucket = map.get(command.group);
      if (bucket) bucket.push(command);
      else map.set(command.group, [command]);
    }
    return [...map.entries()];
  }, [results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const runAt = (index: number) => {
    const command = results[index];
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const count = Math.max(results.length, 1);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % count);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((activeIndex - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runAt(activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const activeCommand = results[activeIndex];
  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      style={{ background: 'var(--app-overlay)' }}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border-strong bg-surface"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border-subtle px-4">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Search categories and actions…"
            aria-label="Search categories and actions"
            aria-controls={listId}
            aria-activedescendant={
              activeCommand ? `${listId}-${activeCommand.id}` : undefined
            }
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="hidden shrink-0 rounded border border-border-subtle px-1.5 py-0.5 text-[11px] text-muted sm:block">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Commands"
          className="max-h-80 overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted">
              No matches for “{query}”
            </p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
                  {group}
                </div>
                {items.map((command) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const isActive = index === activeIndex;
                  const Icon = command.icon;

                  return (
                    <button
                      key={command.id}
                      id={`${listId}-${command.id}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseMove={() => setActive(index)}
                      onClick={() => runAt(index)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm',
                        isActive ? 'bg-elevated text-foreground' : 'text-muted',
                      )}
                    >
                      {Icon ? (
                        <Icon aria-hidden className="h-4 w-4 shrink-0" />
                      ) : null}
                      <span className="flex-1 truncate text-foreground">
                        {command.label}
                      </span>
                      {command.hint ? (
                        <span className="shrink-0 text-xs text-muted">
                          {command.hint}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
