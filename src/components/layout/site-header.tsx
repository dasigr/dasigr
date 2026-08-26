'use client';

/**
 * The only interactive chrome on the page, and therefore the only 'use client'
 * boundary in the header/footer/section set — First Load JS for `/` is a tracked
 * budget (under 120 KB gzipped), and every new boundary spends from it.
 *
 * The prototype toggled the mobile menu with a CSS checkbox hack. That works without
 * JS but cannot close itself when a link is followed, and announces nothing to a
 * screen reader, so it becomes a real button with aria-expanded here.
 *
 * The `menu:` variant is the custom ~864px breakpoint from globals.css — six items
 * plus a CTA do not fit beside the brand any earlier.
 *
 * React Compiler is on — no hand-written useCallback/useMemo.
 */

import { useEffect, useState } from 'react';
import type { NavItem } from '@/lib/navigation';

interface SiteHeaderProps {
  navItems: NavItem[];
  brand: string;
}

export function SiteHeader({ navItems, brand }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes the menu — expected of anything that opens over the page.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 h-[var(--header-height)] border-b border-line-soft bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--header-height)] w-full max-w-page items-center justify-between gap-4 px-5">
        <a
          href="#top"
          className="text-base font-bold lowercase tracking-tight text-text hover:no-underline"
          onClick={() => setMenuOpen(false)}
        >
          {brand}
          <span className="text-accent">.</span>
        </a>

        <button
          type="button"
          className="rounded-lg border border-line p-2 menu:hidden"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="block h-0.5 w-5 rounded bg-text" />
          <span
            aria-hidden="true"
            className="mt-1 block h-0.5 w-5 rounded bg-text"
          />
          <span
            aria-hidden="true"
            className="mt-1 block h-0.5 w-5 rounded bg-text"
          />
        </button>

        <nav
          id="primary-navigation"
          aria-label="Primary"
          className={`${
            menuOpen ? 'block' : 'hidden'
          } fixed inset-x-0 top-[var(--header-height)] border-b border-line bg-bg-alt px-5 pt-3 pb-5 menu:static menu:block menu:border-0 menu:bg-transparent menu:p-0`}
        >
          <ul className="flex flex-col gap-0.5 menu:flex-row menu:gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block rounded-lg p-3 text-base font-medium text-dim hover:bg-surface hover:text-text hover:no-underline menu:px-3 menu:py-2 menu:text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="menu:hidden">
              <a
                href="#contact"
                className="mt-2 block rounded-lg bg-accent px-3.5 py-2 text-center font-semibold text-accent-ink hover:bg-accent-bright hover:no-underline"
                onClick={() => setMenuOpen(false)}
              >
                Get My Resume
              </a>
            </li>
          </ul>
        </nav>

        <a
          href="#contact"
          className="hidden rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-bright hover:no-underline menu:inline-block"
        >
          Get My Resume
        </a>
      </div>
    </header>
  );
}
